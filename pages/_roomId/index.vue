<template>
  <div>
    <div :key="this.$store.state.transports">
      <video id="video" autoplay width="300" height="300" class="ma-5"></video>
      <video v-for="user in this.$store.state.transports" :key="user" autoplay v-bind:id="user" width="300" height="300" class="ma-5"></video>
    </div>
    <v-bottom-navigation fixed class="mx-5">
      <v-btn @click="video" :color="videoState">Video</v-btn>
      <v-btn @click="audio" :color="audioState">Audio</v-btn>
    </v-bottom-navigation>
  </div>
</template>

<script>
const axios = require("axios");

export default {
  data() {
    return {
      videoState : "primary",
      audioState : "primary"
    }
  },

  async asyncData({ params }) {
    const routerId = params.roomId;
    return { routerId };
  },

  async beforeMount() {
    this.$store.commit("createDevice");
    this.$store.commit("assignRouterId", this.routerId);
    await this.$store.dispatch("loadDevice");
    await this.$store.dispatch("createSendTransport");
    await this.$store.dispatch("createReceiveTransport");
    await this.$store.dispatch("createProducer");
  },

  async mounted() {
    setInterval(() => this.$store.dispatch("getTransportsByRouterId"), 1000);
    window.onbeforeunload = () => {
      this.$store.dispatch("closeTransport")
    }
  },

  methods: {
    video() {
      this.$store.commit("changeVideoState")
      if (this.$store.state.videoTrack.enabled == true) {
        this.videoState = "primary"
      } else {
        this.videoState = "error"
      }
    },

    audio() {
      this.$store.commit("changeAudioState")
      if (this.$store.state.audioTrack.enabled == true) {
        this.audioState = "primary"
      } else {
        this.audioState = "error"
      }
    }
  }

};

</script>