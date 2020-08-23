import { User, Asset, FlamingoConfig } from './config'
import { Resource } from './resources/Resource'
import { ResourceManager } from './resources/ResourceManager'
import { DatabaseRepositoryInterface } from './databases/DatabaseRepositoryInterface'

import { Mail } from '@flamingo/mail'

declare global {
    namespace Express {
        export interface Request {
            admin: User
            Mailer: Mail
            styles: Asset[]
            scripts: Asset[]
            appConfig: FlamingoConfig
            db: DatabaseRepositoryInterface
            administratorResource: Resource
            resourceManager: ResourceManager
            resources: FlamingoConfig['resourcesMap']
        }
    }
}

export { text, Text } from './fields/Text'
export { link, Link } from './fields/Link'
export { Json, json } from './fields/Json'
export { date, DateField } from './fields/Date'
export { hasOne, HasOne } from './fields/HasOne'
export { select, Select } from './fields/Select'
export { hasMany, HasMany } from './fields/HasMany'
export { integer, Integer } from './fields/Integer'
export { number, NumberField } from './fields/Number'
export { dateTime, DateTime } from './fields/DateTime'
export { password, Password } from './fields/Password'
export { textarea, Textarea } from './fields/Textarea'
export { Field, SerializedField } from './fields/Field'
export { belongsTo, BelongsTo } from './fields/BelongsTo'
export { bigInteger, BigInteger } from './fields/BigInteger'
export { belongsToMany, BelongsToMany } from './fields/BelongsToMany'

export { Tool, tool, ToolSetupConfig } from './tools/Tool'
export { ResourceManager } from './resources/ResourceManager'
export { action, SerializedAction, Action } from './actions/Action'
export { resource, Resource, SerializedResource } from './resources/Resource'
export { DatabaseRepositoryInterface } from './databases/DatabaseRepositoryInterface'

export * from './config'
