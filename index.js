/**
nexmo context: 
you can find this as the second parameter of rtcEvent funciton or as part or the request in req.nexmo in every request received by the handler 
you specify in the route function.

it contains the following: 
const {
        generateBEToken,
        generateUserToken,
        logger,
        csClient,
        storageClient
} = nexmo;

- generateBEToken, generateUserToken,// those methods can generate a valid token for application
- csClient: this is just a wrapper on https://github.com/axios/axios who is already authenticated as a nexmo application and 
    is gonna already log any request/response you do on conversation api. 
    Here is the api spec: https://jurgob.github.io/conversation-service-docs/#/openapiuiv3
- logger: this is an integrated logger, basically a bunyan instance
- storageClient: this is a simple key/value inmemory-storage client based on redis

*/



/** 
 * 
 * This function is meant to handle all the asyncronus event you are gonna receive from conversation api 
 * 
 * it has 2 parameters, event and nexmo context
 * @param {object} event - this is a conversation api event. Find the list of the event here: https://jurgob.github.io/conversation-service-docs/#/customv3
 * @param {object} nexmo - see the context section above
 * */

const path = require('path');

const CS_URL = `https://api.nexmo.com`
const WS_URL = `https://ws.nexmo.com`

const rtcEvent = async (event, { logger, csClient }) => {

    try { 

    } catch (err) {
        
        logger.error({err}, "Error on rtcEvent function")
    }
    
}


/**
 * 
 * @param {object} app - this is an express app
 * you can register and handler same way you would do in express. 
 * the only difference is that in every req, you will have a req.nexmo variable containning a nexmo context
 * 
 */
const route = (app, express) => {
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('/', function (req, res) {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });

    app.post('/api/ncco2', async (req, res) => {
        const {
            logger,
            csClient,
            storageClient,
            config
        } = req.nexmo;

        logger.info("req", { req_body: req.body })

        const { conversation_uuid, speech, from } = req.body
        const conv_id = conversation_uuid
        const user_name = speech && speech.results && speech.results[0].text 

        await csClient({
            url: `${CS_URL}/v0.3/conversations/${conv_id}`,
            method: "put",
            data: {
                properties: {
                    custom_data: {
                        caller_name: user_name
                    }
                }
            }
        })

        // const conv = await csClient({
        //     url: `${CS_URL}/v0.3/conversations/${conv_id}`,
        //     method: "get",
        // })

        // logger.info(`conv data`, {
        //     conv_custom_data: conv.data.properties.custom_data
        // })

        res.json([
            {
                "action": "talk",
                "text": `your name is: ${user_name}`
            },
            {
                "action": "connect",
                "from": from,
                "endpoint": [
                    {
                        "type": "app",
                        "user": "jurgo",
                    }
                ]
            }
        ])

    })

    app.post('/api/login', (req, res) => {
        const {
            generateBEToken,
            generateUserToken,
            logger,
            csClient,
            storageClient
        } = req.nexmo;

        const { username } = req.body;
        res.json({
            user: username,
            token: generateUserToken(username),
            ws_url: WS_URL,
            cs_url: CS_URL
        })
    })


    app.post('/api/subscribe', async (req, res) => {

        const {
            generateBEToken,
            generateUserToken,
            logger,
            csClient,
            storageClient
        } = req.nexmo;

        try {
            const { username } = req.body;
            const resNewUser = await csClient({
                url: `${CS_URL}/v0.3/users`,
                method: "post",
                data: {
                    name: username
                },
            })

            await storageClient.set(`user:${username}`, resNewUser.data.id)
            const storageUser = await storageClient.get(`user:${username}`)

            return res.json({ username, resNewUser: resNewUser.data, storageUser })
        } catch (err) {
            console.log(err)
            logger.error({ err }, "ERROR")
            throw err;
        }

    })

    app.get('/api/users/:username', async (req, res) => {
        const {
            logger,
            csClient,
            storageClient
        } = req.nexmo;

        const { username } = req.params;

        const user = await storageClient.get(`user:${username}`)

        // logger.error({ user }, "STORAGE")
        res.json({ user })

    })
}

const voiceEvent = async (req, res, next) => {
    const { logger, csClient } = req.nexmo;

    try {

        res.json({})

    } catch (err) {

        logger.error("Error on voiceEvent function")
    }

}


const voiceAnswer = async (req, res, next) => {
    const { logger, csClient, config } = req.nexmo;
    logger.info("req", { req_body: req.body })

    
    try {
        return res.json([
            {
                "action": "talk",
                text: `Please say your name`
            },
            {
                "action": "input",
                "type": ["speech"],
                "eventUrl": [
                    `${config.server_url}/api/ncco2`
                ],
            }
        ])

    } catch (err) {

        logger.error("Error on voiceAnswer function", err)
    }

}


module.exports = {
    // rtcEvent,
    route,
    voiceEvent,
    voiceAnswer
}