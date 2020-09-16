/*
 *    options.js - Update the user settings
 *
 *    Copyright (C) 2020  PolarPiBerry
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Settings object
 * @typedef {Object} Settings
 * @property {string} ipAddress IP of printer
 * @property {string} from Address of seller
 * @property {string} messages Messages to add to receipt
 * @property {boolean} saveFiles Save copies of receipts
 * @property {string} saveFilesLocation Path to where to save copies of receipts
 */

const DEFAULT_SETTINGS = {
  ipAddress: "",
  from: "",
  saveFiles: "Y",
  saveFilesLocation: "Receipts",
  messages: ["Thank you for your business!"]
}

/**
 * Get the settings from storage
 * 
 * @function getSettings
 * @returns {Promise} Promise containing Settings object
 */
let getSettings = () => { //Get the options from memory
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["settings"], (data) => {
      if (!chrome.runtime.lastError) {
        if (data.settings) {
          resolve(data.settings);
        } else {
          reject("Settings not set");
        }
      } else {
        reject(chrome.runtime.lastError);
      }
    });
  });
}

/**
 * Save the settings to memory
 * 
 * @function saveSettings
 * @param {Settings} settings
 * @returns {Promise} Promise of status
 */
let saveSettings = (settings) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({settings: settings}, () => {
      if (!chrome.runtime.lastError) {
        resolve();
      } else {
        reject(chrome.runtime.lastError);
      }
    });
  });
}

/**
 * Show the settings on the page
 * 
 * @function displaySettings
 * @param {Settings} settings
 */
let displaySettings = (settings) => { //Display the settings on the page
  for (let key in settings) {
    if (key == "saveFiles") {
      console.log("#form-" + key + "-" + settings[key])
      document.querySelector("#form-" + key + "-" + settings[key]).checked = true;
      onSaveFilesChange(settings[key] == "Y")
    } else {
      console.log(key);
      document.querySelector("#form-" + key).value = settings[key];
    }
  }
}

/**
 * Show the save file path box based on the status
 * 
 * @function onSaveFilesChange
 * @param {boolean} show Show or hide the box
 */
let onSaveFilesChange = (show) => {
  if (show) {
    document.querySelector("#form-saveFilesLocation-show").classList.remove("d-none");
  } else {
    document.querySelector("#form-saveFilesLocation-show").classList.add("d-none");
  }
}

/**
 * Event handler for settings form submit - validate and save the new settings
 * 
 * @function updateSettings
 * @param {Object} e Event object
 */
let updateSettings = (e) => {
  e.preventDefault();
  let data = {};
  let form_data = new FormData(e.target);
  form_data.forEach((v, k) => data[k] = v);
  if (validateSettings(data)) {
    saveSettings(data).then(() => {
      document.querySelector("#info-msg").innerHTML = "Settings updated";
      document.querySelector("#info-msg").classList = "text-info";
    }).catch((err) => {
      document.querySelector("#info-msg").innerHTML = "Settings valid, but error while updating. Please try again.";
      document.querySelector("#info-msg").classList = "text-danger";
    })
  }
}

/**
 * Validate the settings
 * 
 * @function validateSettings
 * @param {Settings} settings Settings object (see DEFAULT_SETTINGS)
 * @returns {boolean} If settings are valid
 */
let validateSettings = (settings) => {
  return (settings.from && settings.from.length > 0)
          && (settings.ipAddress && settings.ipAddress.length > 0)
          && (settings.messages && settings.messages.length > 0)
          && ((settings.saveFiles == "Y" && (settings.saveFilesLocation && settings.saveFilesLocation.length > 0)) || (settings.saveFiles == "N"))
}



window.onload = () => { //Add event listeners
  document.querySelector("#settings-form").onsubmit = (e) => updateSettings(e);
  document.querySelector("#form-saveFiles-Y").onchange = () => onSaveFilesChange(true);
  document.querySelector("#form-saveFiles-N").onchange = () => onSaveFilesChange(false);
  getSettings().then((settings) => {
    if (validateSettings(settings)) {
      document.querySelector("#info-msg").innerHTML = "Settings loaded and validated";
      document.querySelector("#info-msg").classList = "text-success";
    } else {
      document.querySelector("#info-msg").innerHTML = "Settings loaded but invalid";
      document.querySelector("#info-msg").classList = "text-danger";
    }
    console.log("Loaded data: ", settings);
    displaySettings(settings);
  }).catch((err) => {
    console.log(err);
    document.querySelector("#info-msg").innerHTML = "No settings saved. Please enter them below and press Save Settings";
    document.querySelector("#info-msg").classList = "text-danger";
    displaySettings(DEFAULT_SETTINGS);
  });
}
