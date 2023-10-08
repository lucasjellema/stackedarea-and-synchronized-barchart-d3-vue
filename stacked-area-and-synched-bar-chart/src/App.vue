<script setup>
import { useCollaborationStore } from './stores/collaborationStore';
import { ref, computed } from 'vue';
import StackedAreaPlusBar from './components/StackedArea.vue'

const countries = ref([])
countries.value.push("Belgium")

function handleButtonClick(collboaratingCountries) {
  countries.value = collboaratingCountries
}

function handleBarClick(eventData) {
      console.log('Bar Clicked:', eventData);
      // You can handle the bar click event here
    }


const collaborationStore = useCollaborationStore();
</script>

<template>
  <h1>People {{collaborationStore.recordCount}} - {{collaborationStore.heatmaprecordCount}}</h1>

    <div>
    <h1>Collaboration of Countries {{ countries }}</h1>
    <button @click="handleButtonClick(['Indonesia','Singapore'])">Collaborate Indonesia and Singapore</button>
    <button @click="handleButtonClick(['Germany','The Netherlands'])">Collaborate Germany and Netherlands</button>
    <button @click="handleButtonClick(['USA','Canada','Mexico'])">Collaborate USA, Canada, Mexico</button>
    <div>
    <StackedAreaPlusBar :countries=countries @bar-clicked="handleBarClick"/>
    </div>
  </div>
</template>
