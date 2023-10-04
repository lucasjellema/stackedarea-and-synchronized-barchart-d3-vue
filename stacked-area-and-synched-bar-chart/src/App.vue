<script setup>

import StackedAreaPlusBar from './components/StackedAreaPlusBar.vue'
import { ref, computed, watch } from 'vue';
const countries = ref([])
countries.value.push("Belgium")

</script>

<template>
  <div>
    <h1>Collaboration of Countries {{ countries }}</h1>
    <StackedAreaPlusBar :countries=countries />
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
}
</style>
