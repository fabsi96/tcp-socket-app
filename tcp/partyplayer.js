
import TcpSockets from 'react-native-tcp-socket'

export default class PartyPlayer {
    constructor(playerName) {
        this._playerName = playerName

        this._clientSocket = null

        this._actions = []
        this._responses = []

        this._isWriting = false
        this._messageQueue = []
    }

    static create = (socket) => {
        let p = new PartyPlayer('<empty>')
        p.register(socket)
        return p
    }

    register = (socket) => {
        this._clientSocket = socket
    }

    getPlayerName = () => {
        this._playerName
    }

    isConnected = () => {
        if (this._clientSocket != null &&
            !this._clientSocket._destroyed)
            return true

        return false
    }

    connect = (ip, port) => {
        try
        {
            // Already connected.
            if (this._clientSocket != null &&
                !this._clientSocket._destroyed)
            {
                console.log("connect: Socket is already connected.");
                return
            }

            var self = this
            /** @type {TcpSockets.Socket} */
            this._clientSocket = TcpSockets.createConnection({
                host: ip,
                port: port
            })

            this._clientSocket.on('connect', () => {
                // !
                self._clientSocket._destroyed = false
                // !

                console.log("client: 'connect': " + self._clientSocket._destroyed);
                self.notifyAction('action-connected')
            })

            this._clientSocket.on('data', (data) => {
                console.log("client: 'data' ")
                try
                {
                    let json = JSON.parse(data)
                    if (json.node === undefined ||
                        json.data === undefined)
                        throw 'client: node and/or data is undefined.'

                    self.notifyResponse(json.node, json.data)
                } catch (e)
                {
                    console.log("client: 'data' Error: " + e.toString());
                }
            })

            this._clientSocket.on('timeout', () => {
                console.log("client: 'timeout'")
            })

            this._clientSocket.on('close', (had_error) => {
                // !
                self._clientSocket._destroyed = true
                // !

                console.log("client: 'close': " + self._clientSocket._destroyed)
                self.notifyAction('action-disconnected')
            })

            this._clientSocket.on('error', (error) => {
                console.log("client: 'error': " + error.toString());
            })

        } catch (e)
        {
            console.log("connect: Error: " + e.toString());
        }
    }

    disconnect = () => {
        this._clientSocket.destroy()
        this._clientSocket.emit('close')
        this._clientSocket.removeAllListeners()

        this.offAll()
    }

    onAction = (node, method) => {
        this._actions.push({
            node: node,
            method: method
        })
    }

    notifyAction = (node) => {
        this._actions.forEach((action_o, index) => {
            try
            {
                if (action_o.node === node)
                    action_o.method()
            } catch (e)
            {
                console.log("notifyAction: action error: " + e.toString());
            }
        })
    }

    onResponse = (node, method) => {
        this._responses.push({
            node: node,
            method: method
        })
    }

    notifyResponse = (node, data) => {
        this._responses.forEach((fun, index) => {
            try
            {
                if (fun.node === node)
                    fun.method(data)
            } catch (e)
            {
                console.log("notifyResponse: method error: " + e.toString());
            }
        })
    }

    offAll = () => {
        this._actions = []
        this._responses = []
    }

    sendObject = (node, data) => {
        if (this._clientSocket == null ||
            this._clientSocket._destroyed)
        {
            console.log("sendObject: Error: client is not connected.")
            // throw 'err-not-connected'
            return
        }

        this._messageQueue.push({
            node: node,
            data: data
        })

        if (this._isWriting)
        {
            console.log("sendObject: Error: socket is writing now. Message is send later.");
            return
        }

        this.dataQueue()
    }

    dataQueue = () => {
        try
        {
            // Get the first (latest) - bottom up
            let nextEntry = this._messageQueue.shift()

            // JavaScript Object Notation to string
            let jsonString = JSON.stringify(nextEntry)

            /** @type{TcpSockets.Socket} */
            this._isWriting = true
            this._clientSocket.write(jsonString, 'utf-8', () => {
                this.writeEnd(nextEntry.id)
            })
        } catch (e)
        {
            console.log("dataQueue: Error: " + e.toString());
        }
    }

    writeEnd = () => {
        if (this._messageQueue.length == 0)
        {
            this._isWriting = false
            return
        }

        setTimeout(this.dataQueue, 50)
    }

    /**
     * 
     * @param {TcpSockets.Socket} socket Raw socket
     */
    logSocket = (socket) => {
        console.log(`<${socket.remoteAddress}:${socket.remotePort}>`);
    }

}