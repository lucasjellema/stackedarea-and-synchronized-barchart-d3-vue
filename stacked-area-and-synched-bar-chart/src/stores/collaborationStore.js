import { defineStore } from 'pinia';
import * as d3 from 'd3';

import collabRecords from './collaborationdata.csv';
import fakeRecords from './fakecollaborationdata.json';
import heatmapRecords from './heatmaps.csv';

export const useCollaborationStore = defineStore({
  id: 'collaboration',
  state: () => ({
    collaborationData: collabRecords,
    fakeDataSet: fakeRecords,
    heatmapData: heatmapRecords
  }),
  getters: {
    recordCount: (state) => {
      return state.collaborationData.length;
    },
    heatmaprecordCount: (state) => {
      return state.heatmapData.length;
    },
    fakeData: (state) => {
      return state.fakeDataSet;
    },
  },
  actions: {
    async prepareData() {
      prepareFakeData(this.fakeDataSet)
      this.myData = {prop:42}
    }

  },
});

function prepareFakeData(data) {
  data.sort((a, b) => d3.ascending(a.x, b.x));
  // Iterate through the array of objects
  for (const obj of data) {
      let sum = Object.keys(obj).reduce(function (sum, key) {
          if (key !== 'x') {
              return sum + obj[key];
          }
          return sum;
      }, 0);
      obj['sum'] = sum
  }
  
}