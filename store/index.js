const { types } = require('mediasoup-client')
const mediasoupClient = require('mediasoup-client')
const axios = require('axios')

export const state = () => ({
    transports: [],
    tracks: {}
})

export const mutations = {
    createDevice(state) {
        if (!state.device) {
            state.device = new mediasoupClient.Device()
        }
    },

    assignRouterId(state, routerId) {
        state.routerId = routerId
    },

    async loadDevice(state, rtpCapabilities) {
        state.rtpCapabilities = rtpCapabilities
        await state.device.load({ routerRtpCapabilities: rtpCapabilities })
    },

    async createSendTransport(state, transportConfig) {
        const transport = state.device.createSendTransport(transportConfig)
        state.sendTransport = transport
    },

    async createReceiveTransport(state, transportConfig) {
        const transport = state.device.createRecvTransport(transportConfig)
        state.receiveTransport = transport
    },

    async createProducer(state, { videoTrack, audioTrack }) {
        let video = document.getElementById('video')
        state.sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
                await axios.post(`http://localhost:8080/${state.sendTransport.id}/transport-connect`, { dtlsParameters: dtlsParameters })
                callback()
            }
            catch (error) {
                errback(error)
            }
        })
        state.sendTransport.on("produce", async (producerOptions, callback, errback) => {
            try {
                let producer = (await axios.post(`http://localhost:8080/${state.sendTransport.id}/createProducer`, { producerOptions: producerOptions })).data
                if (producer._data.kind == 'audio') {
                    state.audioProducer = producer
                } else {
                    state.videoProducer = producer
                }
                callback(producer)
            }
            catch (error) {
                errback(error)
            }
        })
        await state.sendTransport.produce({
            track: videoTrack
        })
        await state.sendTransport.produce({
            track: audioTrack
        })
        state.videoTrack = videoTrack
        state.audioTrack = audioTrack
        state.videoTrack.enabled = true
        state.audioTrack.enabled = true
        video.srcObject = new MediaStream([ videoTrack ])
    },

    async createConsumer(state, { consumers, transportId }) {
        state.receiveTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
                await axios.post(`http://localhost:8080/${state.receiveTransport.id}/transport-connect`, { dtlsParameters: dtlsParameters })
                callback()
            }
            catch (error) {
                errback(error)
            }
        })
        let consumer1 = await state.receiveTransport.consume(
            {
                id: consumers[0]._internal.consumerId,
                producerId: consumers[0]._internal.producerId,
                kind: consumers[0]._data.kind,
                rtpParameters: consumers[0]._data.rtpParameters
            }
        )
        let consumer2 = await state.receiveTransport.consume(
            {
                id: consumers[1]._internal.consumerId,
                producerId: consumers[1]._internal.producerId,
                kind: consumers[1]._data.kind,
                rtpParameters: consumers[1]._data.rtpParameters
            }
        )
        let video
        let audio
        if (consumer1._track.kind == "video") {
            video = consumer1._track
            audio = consumer2._track
        } else {
            video = consumer2._track
            audio = consumer1._track
        }
        const stream = document.getElementById(transportId)
        stream.srcObject = new MediaStream([video, audio])
    },

    addTransport(state, transport) {
        state.transports.push(transport)
    },

    removeTransport(state, transport) {
        for (let i = 0; i< state.transports.length; i++) {
            if (state.transports[i] == transport) {
                state.transports.splice(i, 1)
            }
        }
    },

    changeVideoState(state) {
        if (state.videoTrack.enabled == true) {
            state.videoTrack.enabled = false
        } else {
            state.videoTrack.enabled = true
        }
    },

    changeAudioState(state) {
        if (state.audioTrack.enabled == true) {
            state.audioTrack.enabled = false
        } else {
            state.audioTrack.enabled = true
        }
    }
}

export const getters = {
    getDevice(state) {
        return state.device
    },

    getRouterId(state) {
        return state.routerId
    },

    getProducers(state) {
        let producers = []
        producers.push(state.audioProducer._internal.producerId)
        producers.push(state.videoProducer._internal.producerId)
        return producers
    },

    getTransportId(state) {
        return state.sendTransport.id
    },

    getExistingTransports(state) {
        return state.transports
    },

    getRtpCapabilities(state) {
        return state.rtpCapabilities
    },

    getReceiveTransportId(state) {
        return state.receiveTransport.id
    },
    
    getTrack(state) {
        return state.tracks
    },

    getVideoState(state) {
        console.log(state.videoTrack)
    },

    getAudioState(state) {
        console.log(state.audioTrack)
        // return state.audioTrack.enabled
    }
}

export const actions = {
    async loadDevice(state) {
        const routerId = state.getters.getRouterId
        const rtpCapabilities = (await axios.get(`http://localhost:8080/${routerId}`)).data
        await state.commit('loadDevice', rtpCapabilities)
    },

    async createSendTransport(state) {
        const routerId = state.getters.getRouterId
        const transportConfig = (await axios.post(`http://localhost:8080/create-transport/${routerId}`)).data
        transportConfig._data.id = transportConfig._internal.transportId
        await state.commit('createSendTransport', transportConfig._data)
    },

    async createReceiveTransport(state) {
        const routerId = state.getters.getRouterId
        const transportConfig = (await axios.post(`http://localhost:8080/create-transport/${routerId}`)).data
        transportConfig._data.id = transportConfig._internal.transportId
        await state.commit('createReceiveTransport', transportConfig._data)
    },

    async createProducer(state) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const videoTrack = stream.getVideoTracks()[0]
        const audioTrack = stream.getAudioTracks()[0]
        await state.commit('createProducer', { videoTrack, audioTrack })
    },

    async createConsumer(state, transportId) {
        const receiveTransportId = state.getters.getReceiveTransportId
        const producers = (await axios.get(`http://localhost:8080/${transportId}/producers`)).data
        const rtpCapabilities = state.getters.getRtpCapabilities
        let consumers = []
        for (let i = 0; i < producers.length; i++) {
            let consumer = (await axios.post(`http://localhost:8080/${receiveTransportId}/createConsumer`, { producerId: producers[i], rtpCapabilities: rtpCapabilities})).data
            consumers.push(consumer)
        }
        state.commit('createConsumer', { consumers, transportId })
    },

    async getTransportsByRouterId(state) {
        const routerId = state.getters.getRouterId
        const existingTransports = state.getters.getExistingTransports
        const transports = (await axios.get(`http://localhost:8080/${routerId}/transports`)).data
        const localTransport = state.getters.getTransportId
        for (let i = 0; i < transports.length; i++) {
            if (localTransport != transports[i] && !existingTransports.includes(transports[i])) {
                state.commit('addTransport', transports[i])
                state.dispatch('createConsumer', transports[i])
            }
        }
        for (let i = 0; i < existingTransports.length; i++) {
            if (!transports.includes(existingTransports[i])) {
                state.commit('removeTransport', existingTransports[i])
                console.log(existingTransports[i])
            }
        }
    },

    closeTransport(state) {
        const sendTransport = state.getters.getTransportId
        const receiveTransport = state.getters.getReceiveTransportId
        axios.put(`http://localhost:8080/${sendTransport}/closeTransport`)
        axios.put(`http://localhost:8080/${receiveTransport}/closeTransport`)
        state.sendTransport.close()
        state.receiveTransport.close()
    }
}


export const strict = false