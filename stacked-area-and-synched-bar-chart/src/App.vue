<script setup>
import { useCollaborationStore } from './stores/collaborationStore';
import { ref, computed } from 'vue';
import StackedAreaPlusBar from './components/StackedArea.vue'

const countries = ref([])
countries.value.push("SG")

function handleButtonClick(collboaratingCountries) {
  countries.value = collboaratingCountries
}

function handleBarClick(eventData) {
  console.log('Bar Clicked:', eventData);
  // You can handle the bar click event here
}


const collaborationStore = useCollaborationStore();
//TODO read from collaboration store which combinations of collaborating countries are even available - in addition to the fake data set
</script>

<template>
  <div>
    <h1>Collaboration of Countries {{ countries }}</h1>
    <button @click="handleButtonClick(['ID','SG'])">Collaborate Indonesia and Singapore</button>
    <button @click="handleButtonClick(['ID'])">Just Indonesia</button>
    <button @click="handleButtonClick(['MM','PH'])">Collaborate Myanmar and Philipines</button>
    <button @click="handleButtonClick(['FAKE'])">Show Fake Data</button>
    <div>
      <StackedAreaPlusBar :countries=countries @bar-clicked="handleBarClick" />
    </div>
  </div>
</template>
