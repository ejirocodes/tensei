import { ResourceContract, Permission, PluginSetupConfig } from '@tensei/common'
import { sentenceCase } from 'change-case'

import { AuthPluginConfig } from './config'

export default async (
    resources: ResourceContract[],
    config: AuthPluginConfig,
    manager: PluginSetupConfig['manager']
) => {
    const UserResource = resources.find(
        (resource) => resource.data.name === config.nameResource
    )
    const RoleResource = resources.find(
        (resource) => resource.data.name === config.roleResource
    )
    const PermissionResource = resources.find(
        (resource) => resource.data.name === config.permissionResource
    )

    if (!UserResource || !RoleResource || !PermissionResource) {
        throw new Error(
            `Resources were not setup correctly. Something went wrong.`
        )
    }

    // @ts-ignore
    const UserModel = UserResource.Model()
    // @ts-ignore
    const RoleModel = RoleResource.Model()
    // @ts-ignore
    const PermissionModel = PermissionResource.Model()

    const permissions: Permission[] = []

    resources.forEach((resource) => {
        ;['create', 'read', 'update', 'delete'].forEach((operation) => {
            permissions.push(`${operation}:${resource.data.slug}`)
        })

        resource.data.actions.forEach((action) => {
            permissions.push(`run:${resource.data.slug}:${action.data.slug}`)
        })

        resource.data.permissions.forEach((permission) => {
            permissions.push(permission)
        })
    })

    // find all existing permissions
    const existingPermissions = (
        await PermissionModel.query().whereIn('slug', permissions)
    ).map((permission: any) => permission.slug)

    const newPermissionsToCreate = permissions.filter(
        (permission) =>
            !existingPermissions.includes(
                typeof permission === 'string' ? permission : permission.slug
            )
    )

    const insertPermissions = Array.from(new Set(newPermissionsToCreate)).map(
        (permission) => ({
            name:
                typeof permission === 'string'
                    ? sentenceCase(permission.split(':').join(' '))
                    : permission.name,
            slug: permission,
        })
    )

    if (insertPermissions.length > 0) {
        await PermissionModel.query().insert(insertPermissions)
    }
}
