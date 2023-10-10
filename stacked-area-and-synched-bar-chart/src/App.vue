<script setup>
import { useCollaborationStore } from './stores/collaborationStore';
import { ref, computed } from 'vue';
import StackedAreaPlusBar from './components/StackedArea.vue'
import WorldMap from './components/WorldMap.vue'

const countries = ref([])
const selectedTechnology = ref("")
const selectedCountry = ref("")
const isChecked = ref(true);
countries.value.push("SG")

function handleButtonClick(collboaratingCountries) {
  countries.value = collboaratingCountries
}

function handleBarClick(eventData) {
  console.log('Bar Clicked:', eventData);
  selectedTechnology.value = eventData.index.series
}
function handleCountryClick(eventData) {
  console.log('Country Clicked:', eventData);
  selectedCountry.value = eventData.index.name
}

const collaborationStore = useCollaborationStore();
//TODO read from collaboration store which combinations of collaborating countries are even available - in addition to the fake data set
</script>

<template>
  <div>
    <!-- Checkbox to toggle between components -->
    <input type="checkbox" v-model="isChecked"/>Show Area Chart or World Map


  <div v-if="isChecked">
    <h1>Collaboration of Countries {{ countries }}</h1>
    <p>    <button @click="handleButtonClick(['ID', 'SG'])">Collaborate Indonesia and Singapore</button>
    <button @click="handleButtonClick(['ID'])">Just Indonesia</button>
    <button @click="handleButtonClick(['SG'])">Just Singapore</button>
  </p>
    <p>
    <button @click="handleButtonClick(['MM', 'PH'])">Collaborate Myanmar and Philipines (FAKE)</button>
    <button @click="handleButtonClick(['MM'])">Just Myanmar (FAKE)</button>
    <button @click="handleButtonClick(['FAKE'])">Show Fake Data</button>
  </p>
    <div>
      <StackedAreaPlusBar :countries=countries @bar-clicked="handleBarClick" />
      Most recently selected technology: {{ selectedTechnology }}
    </div>
  </div>
  <div v-else="isChecked">

    <WorldMap @country-clicked="handleCountryClick"></WorldMap>
    Most recently selected country: {{ selectedCountry }}
  </div>
</div>
</template>
