import { TenseiState } from '@tensei/components'
import { ApolloClient, InMemoryCache } from '@apollo/client'

class Core {
    state = (() => {
        let ctx = {}
        let admin = null
        let resources = []
        let permissions = {}
        let registered = false

        const { ___tensei___ } = window

        try {
            ctx = JSON.parse(___tensei___.ctx)
            resources = JSON.parse(___tensei___.resources)
            registered = ___tensei___.registered === 'true'

            admin = JSON.parse(___tensei___.admin || '')

            // user.permissions.forEach((permission) => {
            //     // permissions[permission] = true
            // })
        } catch (errors) {}

        return {
            ctx,
            admin,
            resources,
            permissions,
            registered
        } as TenseiState
    })()

    client = new ApolloClient({
        uri: this.state.ctx.apiPath,
        cache: new InMemoryCache()
    })

    boot = () => {
        console.log('@@booting')
    }
}

window.Tensei = new Core()