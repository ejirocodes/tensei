declare module '@tensei/core' {
    import { Application } from 'express'
    import {
        Config,
        PluginContract,
        ResourceContract,
        PluginSetupFunction,
        DashboardContract,
        DatabaseConfiguration,
        RouteContract,
        GraphQlQueryContract,
        TensieContext,
        EventContract,
        DataPayload
    } from '@tensei/common'

    export interface TenseiContract {
        ctx: Config
        app: Application
        start(fn?: (ctx: Config) => any, listen?: boolean): Promise<this>
        boot(boot: PluginSetupFunction): this
        register(register: PluginSetupFunction): this
        listen(): void
        routes(routes: RouteContract[]): this
        graphQlQueries(routes: GraphQlQueryContract[]): this
        graphQlTypeDefs(defs: TensieContext['graphQlTypeDefs']): this
        db(databaseConfig: DatabaseConfiguration): this
        events(events: EventContract<DataPayload>[]): this
        serverUrl(url: string): this
        clientUrl(url: string): this
        root(path: string): this
        resources(resources: ResourceContract[]): this
        dashboards(dashboards: DashboardContract[]): this
        plugins(plugins: PluginContract[]): this
    }

    export class Tensei implements TenseiContract {
        ctx: Config
        app: Application
        start(fn?: (ctx: Config) => any, listen?: boolean): Promise<this>
        boot(boot: PluginSetupFunction): this
        register(register: PluginSetupFunction): this
        listen(): void
        routes(routes: RouteContract[]): this
        graphQlQueries(routes: GraphQlQueryContract[]): this
        graphQlTypeDefs(defs: TensieContext['graphQlTypeDefs']): this
        db(databaseConfig: DatabaseConfiguration): this
        events(events: EventContract<DataPayload>[]): this
        serverUrl(url: string): this
        clientUrl(url: string): this
        root(path: string): this
        resources(resources: ResourceContract[]): this
        dashboards(dashboards: DashboardContract[]): this
        plugins(plugins: PluginContract[]): this
    }

    export const tensei: () => TenseiContract

    export * from '@tensei/common'
}
