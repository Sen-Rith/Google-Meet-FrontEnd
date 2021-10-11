<template>
  <div>
    <v-btn @click="createRoom">Create Room</v-btn>
    <div width="300px">
      <v-text-field v-model="roomId"></v-text-field>
    </div>
    <v-btn @click="joinRoom">Join Room</v-btn>
  </div>
</template>

<script>
const axios = require('axios')

export default {
  data() {
    return {
      roomId: ''
    }
  },

  beforeMount() {
    this.$store.commit('createDevice')
  },

  methods: {
    async createRoom() {
      const routerId = (await axios.post('http://localhost:8080/create-room')).data
      this.$router.push({ path:`${routerId}`})
    },

    joinRoom() {
      this.$router.push({ path:`${roomId}`})
    }
  }
}
</script>