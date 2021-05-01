
import TcpSockets from 'react-native-tcp-socket';
import PartyPlayer from './partyplayer';

export default class PartyCenter {
    constructor(partyName) {
        this._partyName = partyName

        /** @type{TcpSockets.Server} */
        this._serverSocket = null
        this._clients = []

        this._actions = []
        this._requests = []
    }

    getPartyName = () => {
        return this._partyName
    }

    getNumClients = () => {
        return this._clients.length
    }

    isStarted = () => {
        if (this._serverSocket != null &&
            this._serverSocket.listening)
            return true

        return false
    }

    start = (port) => {
        var self = this

        try
        {
            this._serverSocket = TcpSockets.createServer((client) => {
                // !
                client._destroyed = false
                self._clients.push(client)
                self.notifyAction('action-client-connected')
                // console.log("server: Client connected: " + client._destroyed)
                // !

                client.on('data', (data) => {
                    // console.log("server: Client sent data: " + data.toString());
                    try
                    {
                        let json = JSON.parse(data)
                        if (json.node === undefined ||
                            json.data === undefined)
                            throw 'Node and/or data is undefined!'

                        self.notifyRequest(client, json.node, json.data)

                    } catch (e)
                    {
                        console.log("server: Client sent invalid data.");
                    }
                })

                client.on('close', () => {
                    // !
                    client._destroyed = true
                    self._clients = self._clients.filter(c => !(c.remoteAddress == client.remoteAddress && c.remotePort == client.remotePort))
                    // console.log("server: Client disconnected: " + client._destroyed)
                    // !

                    self.notifyAction('action-client-disconnected')
                })
            })

            // === Server listeners ===
            this._serverSocket.on('listening', () => {
                // !
                self._serverSocket.listening = true
                // console.log("server: Server started listening for clients: " + self._serverSocket.listening);
                // !

                self.notifyAction('action-server-started')
            })

            this._serverSocket.on('error', (error) => {
                // console.log("server: Server error." + error.toString());
            })

            this._serverSocket.on('close', () => {
                // !
                self._serverSocket.listening = false
                // !
                // console.log("server: Server is closed: " + self._serverSocket.listening);

                self.notifyAction('action-server-stopped')
            })

            this._serverSocket.listen({
                host: '0.0.0.0',
                port: port
            })
        } catch (e)
        {
            console.log("start: Error: " + e.toString());
        }
    }

    stop = () => {
        this._clients.forEach((client, index) => {
            client.destroy()
        })

        this._serverSocket.close()
        if (this._clients.length == 0)
            this._serverSocket.emit('close')
        this._serverSocket.removeAllListeners()

        this._clients = []
    }

    onAction = (action, method) => {
        this._actions.push({
            node: action,
            method: method
        })
    }

    notifyAction = (node) => {
        this._actions.forEach((action, index) => {
            try
            {
                if (node === action.node)
                    action.method()

            } catch (e)
            {
                console.log("notifyAction: method error: " + e.toString());
            }
        })
    }

    onRequest = (reqName, method) => {
        this._requests.push({
            node: reqName,
            method: method
        })
    }

    notifyRequest = (client, node, data) => {
        this._requests.forEach((req, index) => {
            try
            {
                if (node === req.node)
                    req.method(PartyPlayer.create(client), data)

            } catch (e)
            {
                console.log("notifyRequest: Request method '" + req.node + "' error: " + e.toString());
            }
        })
    }

    offAll = () => {
        this._actions = []
        this._requests = []
    }

    /**
     * 
     * @param {[PartyPlayer]} players Player
     * @param {string} node 
     * @param {object} data 
     */
    notifyPlayers = (players, node, data) => {
        players.forEach((player, index) => {
            try
            {
                player.sendObject(node, data)
            } catch (e)
            {
                console.log("notifyPlayers: Error: " + e.toString());
            }
        })
    }
}