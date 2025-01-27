import Path from 'path'
import pino from 'pino'
import Emittery from 'emittery'
import BodyParser from 'body-parser'
import CookieParser from 'cookie-parser'
import { createServer, Server } from 'http'
import Express, { Application } from 'express'
import { mail, MailConfig } from '@tensei/mail'
import AsyncHandler from 'express-async-handler'
import { validator, sanitizer } from 'indicative'
import { responseEnhancer } from 'express-response-formatter'
import { StorageManager, Storage } from '@slynova/flydrive'

import {
    Asset,
    Config,
    plugin,
    route,
    event,
    RouteContract,
    PluginContract,
    ResourceContract,
    SetupFunctions,
    DashboardContract,
    StorageConstructor,
    SupportedStorageDrivers,
    ExtendMailCallback,
    EventContract,
    DataPayload
} from '@tensei/common'
import Database from './database'
import {
    TenseiContract,
    DatabaseConfiguration,
    TensieContext,
    GraphQlQueryContract,
    PluginSetupConfig,
    PluginSetupFunction
} from '@tensei/core'

export class Tensei implements TenseiContract {
    public app: Application = Express()
    public server: Server = createServer(this.app)
    public extensions: {
        [key: string]: any
    } = {}
    private databaseBooted: boolean = false
    private registeredApplication: boolean = false

    private defaultStorageConfig = {
        default: 'local',
        disks: {
            local: {
                driver: 'local',
                config: {
                    root: `${process.cwd()}/storage`,
                    publicPath: `public`
                }
            }
        }
    }

    private mailerConfig: MailConfig = {
        mailers: {
            fake: {
                driver: 'fake'
            }
        },
        mailer: 'fake' as never
    }

    public ctx: Config = {} as any

    public constructor() {
        this.initCtx()
    }

    private initCtx() {
        this.ctx = {
            schemas: [],
            routes: [],
            events: {},
            root: process.cwd(),
            emitter: new Emittery(),
            name: process.env.APP_NAME || 'Tensei',
            graphQlQueries: [],
            graphQlTypeDefs: [],
            graphQlMiddleware: [],
            rootBoot: () => {},
            rootRegister: () => {},
            storage: new StorageManager(this.defaultStorageConfig),
            storageConfig: this.defaultStorageConfig,
            databaseClient: null,
            serverUrl: '',
            clientUrl: '',
            resources: [],
            plugins: [],
            dashboards: [],
            resourcesMap: {},
            dashboardsMap: {},
            orm: null,
            databaseConfig: {
                type: 'sqlite',
                entities: []
            },
            scripts: [],
            styles: [],
            logger: pino({
                prettyPrint:
                    process.env.NODE_ENV !== 'production'
                        ? {
                              ignore: 'pid,hostname,time'
                          }
                        : false
            }),
            indicative: {
                validator,
                sanitizer
            },
            graphQlExtensions: [],
            extendGraphQlMiddleware: (...middleware: any[]) => {
                this.ctx.graphQlMiddleware = [
                    ...this.ctx.graphQlMiddleware,
                    ...middleware
                ]
            },
            extendResources: (resources: ResourceContract[]) => {
                this.resources(resources)
            }
        } as any

        this.ctx.mailer = mail(
            this.mailerConfig,
            this.ctx.logger,
            this.ctx.root
        )
    }

    public setConfigOnResourceFields() {
        this.ctx.resources.forEach(resource => {
            resource.data.fields.forEach(field => {
                field.tenseiConfig = this.ctx

                field.afterConfigSet()
            })
        })
    }

    public routes(routes: RouteContract[]) {
        this.ctx.routes = [...this.ctx.routes, ...routes]

        return this
    }

    public graphQlQueries(graphQlQueries: GraphQlQueryContract[]) {
        this.ctx.graphQlQueries = [
            ...this.ctx.graphQlQueries,
            ...graphQlQueries
        ]

        return this
    }

    public graphQlTypeDefs(graphQlTypeDefs: TensieContext['graphQlTypeDefs']) {
        this.ctx.graphQlTypeDefs = [
            ...this.ctx.graphQlTypeDefs,
            ...graphQlTypeDefs
        ]

        return this
    }

    private forceMiddleware() {
        this.app.use((request, response, next) => {
            request.req = request
            request.res = response

            return next()
        })

        this.app.use((request, response, next) => {
            request.authenticationError = (
                message: string = 'Unauthenticated.'
            ) => ({
                status: 401,
                message
            })

            request.forbiddenError = (message: string = 'Forbidden.') => ({
                status: 400,
                message
            })

            request.validationError = (
                message: string = 'Validation failed.'
            ) => ({
                status: 422,
                message
            })

            request.userInputError = (
                message: string = 'Validation failed.',
                properties: any
            ) => ({
                status: 422,
                message,
                ...properties
            })

            return next()
        })
    }

    private async bootApplication() {
        if (this.registeredApplication) {
            return this
        }

        this.forceMiddleware()

        await this.callPluginHook('register')

        await this.ctx.rootRegister(this.getPluginArguments())

        this.setConfigOnResourceFields()

        await this.registerDatabase()

        this.registerAssetsRoutes()
        this.registerMiddleware()

        await this.callPluginHook('boot')
        await this.ctx.rootBoot(this.getPluginArguments())

        this.registerEmitteryListeners()

        this.registerAsyncErrorHandler()

        this.registeredApplication = true

        return this
    }

    private registerEmitteryListeners() {
        Object.keys(this.ctx.events).forEach(eventName => {
            const event = this.ctx.events[eventName]

            event.config.listeners.forEach(listener => {
                this.ctx.emitter.on(eventName as any, listener)
            })
        })

        const originalEmit = this.ctx.emitter.emit.bind(this.ctx.emitter)

        this.ctx.emitter.emit = async (eventName: string, data: any) => {
            return originalEmit(eventName, {
                payload: data,
                ctx: this.ctx
            })
        }
    }

    public async start(fn?: (ctx: Config) => any, listen = true) {
        if (!this.registeredApplication) {
            await this.bootApplication()
        }

        if (fn) {
            const callback = fn(this.ctx)

            if (callback instanceof Promise) {
                fn(this.ctx).then(() => {
                    listen && this.listen()
                })
            } else {
                listen && this.listen()
            }

            return this
        }

        listen && this.listen()

        return this
    }

    public name(name: string) {
        this.ctx.name = name

        return this
    }

    public listen() {
        const port = process.env.PORT || 4500

        this.server.listen(port, () => {
            this.ctx.logger.info(
                `🚀 Access your server on ${
                    this.ctx.serverUrl || `http://127.0.0.1:${port}`
                }`
            )
        })
    }

    getPluginArguments: () => PluginSetupConfig = () => {
        let gql: any = (text: string) => text
        try {
            gql = require('apollo-server-express').gql || gql
        } catch (e) {}

        return {
            app: this.app,
            server: this.server,
            ...this.ctx,
            style: (name: Asset['name'], path: Asset['path']) => {
                this.ctx.styles = [
                    ...this.ctx.styles,
                    {
                        name,
                        path
                    }
                ]
            },
            script: (name: Asset['name'], path: Asset['path']) => {
                this.ctx.scripts = [
                    ...this.ctx.scripts,
                    {
                        name,
                        path
                    }
                ]
            },
            manager: this.ctx.orm ? this.ctx.orm.em.fork() : null,
            gql,
            extendGraphQlQueries: (routes: GraphQlQueryContract[]) => {
                this.graphQlQueries(routes)
            },
            extendGraphQlTypeDefs: (
                typeDefs: TensieContext['graphQlTypeDefs']
            ) => {
                this.graphQlTypeDefs(typeDefs)
            },
            extendRoutes: (routes: RouteContract[]) => {
                this.routes(routes)
            },
            currentCtx: () => this.ctx,
            storageDriver: this.storageDriver.bind(this),
            getQuery: this.getQuery.bind(this),
            getRoute: this.getRoute.bind(this),
            getPlugin: this.getPlugin.bind(this),
            extendMailer: this.extendMailer.bind(this),
            extendEvents: this.events.bind(this),
            extendPlugins: this.plugins.bind(this)
        }
    }

    private extendMailer(
        name: string,
        driver: ExtendMailCallback,
        config?: MailConfig['mailers']
    ) {
        this.mailerConfig = {
            ...this.mailerConfig,
            mailers: {
                ...this.mailerConfig.mailers,
                [name]: {
                    ...(config || {}),
                    driver: name
                }
            }
        }

        this.ctx.mailer = mail(
            this.mailerConfig,
            this.ctx.logger,
            this.ctx.root
        )

        this.ctx.mailer.extend(name, driver)
    }

    private getQuery(path: string) {
        return this.ctx.graphQlQueries.find(query => query.config.path === path)
    }

    private getRoute(id: string) {
        return this.ctx.routes.find(route => route.config.id === id)
    }

    private getPlugin(id: string) {
        // return this.ctx.plugins.find(plugin => plugin.data.)
    }

    private async callPluginHook(
        hook: SetupFunctions,
        plugins = this.ctx.plugins
    ) {
        for (let index = 0; index < plugins.length; index++) {
            const plugin = plugins[index]

            await plugin.config[hook](this.getPluginArguments())
        }

        return this
    }

    public db(databaseConfig: DatabaseConfiguration) {
        this.ctx.databaseConfig = databaseConfig

        return this
    }

    private async bootDatabase() {
        const [orm, schemas] = await new Database(this.ctx).init()

        this.ctx.orm = orm
        this.ctx.schemas = schemas
    }

    private async registerDatabase() {
        if (this.databaseBooted) {
            return this
        }

        await this.bootDatabase()

        this.databaseBooted = true

        return this
    }

    public registerMiddleware() {
        this.app.use(BodyParser.json())

        this.app.use(responseEnhancer())

        this.app.use(CookieParser())

        this.app.disable('x-powered-by')

        const rootStorage = (this.ctx.storageConfig.disks?.local?.config as any)
            .root
        const publicPath = (this.ctx.storageConfig.disks?.local?.config as any)
            .publicPath

        if (rootStorage && publicPath) {
            this.app.use(Express.static(`${rootStorage}/${publicPath}`))
        }

        this.app.use(
            (
                request: Express.Request,
                response: Express.Response,
                next: Express.NextFunction
            ) => {
                request.dashboards = this.ctx.dashboardsMap
                request.resources = this.ctx.resourcesMap
                request.manager = this.ctx.orm!.em.fork()
                request.currentCtx = () => this.ctx
                request.mailer = this.ctx.mailer
                request.config = this.ctx
                request.storage = this.ctx.storage
                request.emitter = this.ctx.emitter

                next()
            }
        )
    }

    public registerAsyncErrorHandler() {
        this.app.use(
            (
                error: any,
                request: Express.Request,
                response: Express.Response,
                next: Express.NextFunction
            ) => {
                const payload: any = {
                    message: error.message || 'Internal server error.'
                }

                if (error.errors) {
                    payload.errors = error.errors
                }

                this.ctx.logger.error(error)

                return response.status(error.status || 500).json(payload)
            }
        )
    }

    public serverUrl(url: string) {
        this.ctx.serverUrl = url

        return this
    }

    public clientUrl(url: string) {
        this.ctx.clientUrl = url

        return this
    }

    public registerAssetsRoutes() {
        this.app.use(
            (
                request: Express.Request,
                response: Express.Response,
                next: Express.NextFunction
            ) => {
                // Set the app config on express here. Should probably get its own function soon.
                request.config = this.ctx
                request.scripts = this.ctx.scripts
                request.styles = this.ctx.styles

                next()
            }
        )

        this.ctx.scripts.concat(this.ctx.styles).forEach(asset => {
            this.app.get(
                `/${asset.name}`,
                this.asyncHandler(
                    (request: Express.Request, response: Express.Response) =>
                        response.sendFile(asset.path)
                )
            )
        })
    }

    private asyncHandler(handler: Express.Handler) {
        return AsyncHandler(handler)
    }

    public resources(resources: ResourceContract[]) {
        const updatedResources = [...this.ctx.resources, ...resources]

        const uniqueResources = Array.from(
            new Set(updatedResources.map(resource => resource.data.name))
        )
            .map(resourceName =>
                updatedResources.find(
                    resource => resource.data.name === resourceName
                )
            )
            .filter(Boolean) as ResourceContract[]

        this.ctx.resources = uniqueResources

        const resourcesMap: Config['resourcesMap'] = {}

        uniqueResources.forEach(resource => {
            resourcesMap[resource.data.slug] = resource
            resourcesMap[resource.data.pascalCaseName] = resource
        })

        this.ctx.resourcesMap = resourcesMap

        return this
    }

    public dashboards(dashboards: DashboardContract[]) {
        const updatedDashboards = [...this.ctx.dashboards, ...dashboards]

        this.ctx.dashboards = Array.from(
            new Set(updatedDashboards.map(dashboard => dashboard.config.name))
        )
            .map(resourceName =>
                updatedDashboards.find(
                    dashboard => dashboard.config.name === resourceName
                )
            )
            .filter(Boolean) as DashboardContract[]

        this.ctx.dashboards.forEach(dashboard => {
            this.ctx.dashboardsMap[dashboard.config.slug] = dashboard
        })

        return this
    }

    public plugins(plugins: PluginContract[]) {
        this.ctx.plugins = [...this.ctx.plugins, ...plugins]

        return this
    }

    private storageDriver<
        StorageDriverImplementation extends Storage,
        DriverConfig extends unknown
    >(
        driverName: SupportedStorageDrivers,
        driverConfig: DriverConfig,
        storageImplementation: StorageConstructor<StorageDriverImplementation>
    ) {
        this.ctx.storageConfig = {
            ...this.ctx.storageConfig,
            disks: {
                ...this.ctx.storageConfig.disks,
                [driverName]: {
                    driver: driverName,
                    config: driverConfig
                }
            }
        }

        this.ctx.storage = new StorageManager(this.ctx.storageConfig)

        this.ctx.storage.registerDriver<StorageDriverImplementation>(
            driverName,
            storageImplementation
        )

        return this
    }

    public defaultStorageDriver(driverName: string) {
        this.ctx.storageConfig = {
            ...this.ctx.storageConfig,
            default: driverName
        }

        this.ctx.storage = new StorageManager(this.ctx.storageConfig)

        return this
    }

    public boot(boot: PluginSetupFunction) {
        this.ctx.rootBoot = boot

        return this
    }

    public register(setup: PluginSetupFunction) {
        this.ctx.rootRegister = setup

        return this
    }

    public events(events: EventContract<DataPayload>[]) {
        events.forEach(event => {
            const eventExists = this.ctx.events[event.config.name]

            if (eventExists) {
                event.config.listeners.concat(eventExists.config.listeners)
            }

            this.ctx.events[event.config.name] = event
        })

        return this
    }

    public root(root: string) {
        this.ctx.root = root

        this.initCtx()

        return this
    }
}

export const tensei = () => new Tensei()

export default Tensei
