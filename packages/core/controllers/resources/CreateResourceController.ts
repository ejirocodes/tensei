import Express from 'express'

class CreateResourceController {
    public store = async (
        request: Express.Request,
        response: Express.Response
    ) => {
        const model = await request.resourceManager.create(
            request,
            request.params.resource,
            request.body
        )

        return response.json(model)
    }
}

export default new CreateResourceController()