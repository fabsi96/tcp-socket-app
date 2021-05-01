import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TcpSockets from 'react-native-tcp-socket'
import { Button, Input } from 'react-native-elements'
import PartyPlayer from './tcp/partyplayer';
import PartyCenter from './tcp/partycenter';


class Requests {
  static PARTY_INFO = 'request-party-info'
}

export default class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      clientCount: 0
    }

    this.player = new PartyPlayer('Fabian')
    this.party = new PartyCenter('House of crazy people!')
  }

  startParty = (ip, port) => {
    try
    {
      var self = this

      // Local actions 
      this.party.onAction('action-client-connected', () => {
        let s = self.state
        s.clientCount = self.party.getNumClients()
        self.setState(s)
      })

      this.party.onAction('action-client-disconnected', () => {
        let s = self.state
        s.clientCount = self.party.getNumClients()
        self.setState(s)
      })
      // ===

      // Functionality
      this.party.onRequest('request-party-info', (player, data) => {
        self.party.notifyPlayers([player], 'response-party-info', {
          partyName: self.party.getPartyName()
        })
        self.party.notifyPlayers([player], 'response-party-info', {
          partyName: self.party.getPartyName()
        })
        self.party.notifyPlayers([player], 'response-party-info', {
          partyName: self.party.getPartyName()
        })
      })
      // ===

      this.party.start(2000)

    } catch (e)
    {
      console.log("startServer: Error: " + e.toString());
    }
  }

  stopParty = () => {
    let s = this.state
    this.party.stop()
    s.clients = []
    this.setState(s)
  }

  connectClient = (ip, port) => {
    var self = this;

    this.player.onAction('action-connected', () => {
      console.log("onAction: action-connected")
      self.player.sendObject('request-party-info', { playerName: self.player.getPlayerName() })
    })
    this.player.onAction('action-disconnected', () => console.log("onAction: action-disconnected"))
    this.player.onResponse('response-party-info', (data) => console.log("onResponse: Party informations: " + data.partyName))

    this.player.connect('10.0.2.16', 2000)
  }

  disconnectClient = () => {
    this.player.disconnect()
  }

  render() {
    return (
      <View style={styles.container}>
        <Text>Hello TCP!</Text>
        <Button
          title="Start/Stop"
          onPress={() => {
            if (!this.party.isStarted())
              this.startParty()
            else
              this.stopParty()
          }}
        />

        <Button
          title="Verbinden/Trennen"
          onPress={() => {
            if (!this.player.isConnected())
              this.connectClient('10.0.2.16', 2000)
            else
              this.disconnectClient()
          }}
        />

        <Input
          placeholder={this.state.clientCount.toString()}
        />
        <Button
          title="Senden"
          onPress={() => {
            this.player.sendObject(Requests.PARTY_INFO, {})
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    height: '100%',
    width: '100%'
  }
});
