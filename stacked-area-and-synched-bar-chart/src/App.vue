<script setup>
import { useCollaborationStore } from './stores/collaborationStore';
import { ref, computed } from 'vue';
import StackedAreaPlusBar from './components/StackedArea.vue'
import WorldMap from './components/WorldMap.vue'

const countries = ref([])
const selectedTechnology = ref("")
const selectedCountry = ref("")
const isChecked = ref(true);
const preSelectedCountries = ref(["SG"])
countries.value.push("SG")

function handleButtonClick(collaboratingCountries) {
  countries.value = collaboratingCountries
  preSelectedCountries.value = collaboratingCountries
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
    <h1>Collaboration of Countries {{ countries }}</h1>
    <p>    
    <button @click="handleButtonClick(['ID', 'SG'])">Collaborate Indonesia and Singapore</button>
    <button @click="handleButtonClick(['ID'])">Just Indonesia</button>
    <button @click="handleButtonClick(['SG'])">Just Singapore</button>
    <button @click="handleButtonClick(['PH'])">Just Philippines</button>
  </p>

  <div v-if="isChecked">

    <p>
    <button @click="handleButtonClick(['IN', 'PH'])">Collaborate India and Philipines (FAKE)</button>
    <button @click="handleButtonClick(['IN'])">Just India (FAKE)</button>
    <button @click="handleButtonClick(['FAKE'])">Show Fake Data</button>
  </p>
    <div>
      <StackedAreaPlusBar :countries=countries @bar-clicked="handleBarClick" />
      Most recently selected technology: {{ selectedTechnology }}
    </div>
  </div>
  <div v-else="isChecked">

    <WorldMap @country-clicked="handleCountryClick" :preSelectedCountries="preSelectedCountries"></WorldMap>
    
  </div>
</div>
</template>
