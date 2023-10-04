<script setup>

import StackedAreaPlusBar from './components/StackedAreaPlusBar.vue'
import { ref, computed, watch } from 'vue';
const countries = ref([])
countries.value.push("Belgium")

function handleButtonClick(collboaratingCountries) {
  countries.value = collboaratingCountries
}

</script>

<template>
  <div>
    <h1>Collaboration of Countries {{ countries }}</h1>
    <button @click="handleButtonClick(['Indonesia','Singapore'])">Collaborate Indonesia and Singapore</button>
    <button @click="handleButtonClick(['Germany','The Netherlands'])">Collaborate Germany and Netherlands</button>
    <button @click="handleButtonClick(['USA','Canada','Mexico'])">Collaborate USA, Canada, Mexico</button>
    <div>
    <StackedAreaPlusBar :countries=countries />
    </div>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
}
</style>
