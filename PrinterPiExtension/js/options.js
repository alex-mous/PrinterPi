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
  * Logo object
  * @typedef {Object} Logo
  * @property {string} data Image data
  * @property {number} width Image width
  * @property {number} height Image height
  */

/**
 * Settings object
 * @typedef {Object} Settings
 * @property {string} ipAddress IP of printer
 * @property {string} from Address of seller
 * @property {Logo} fromLogo Return address logo (if any)
 * @property {string} messages Messages to add to receipt
 * @property {boolean} saveFiles Save copies of receipts
 * @property {string} saveFilesLocation Path to where to save copies of receipts
 * @property {boolean} autoParse Automatically parse page if the page is valid
 */

const DEFAULT_SETTINGS = {
  ipAddress: "",
  from: "",
  fromLogo: null,
  messages: "Thank you for your business!",
  saveFiles: "Y",
  saveFilesLocation: "Receipts",
  autoParse: "N"
}

let saveFromLogo = true; //Save from logo if supplied (or clear if existing)

/**
 * Get the settings from storage
 * 
 * @function getSettings
 * @returns {Promise} Promise containing Settings object
 */
let getSettings = () => { //Get the options from memory
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["settings"], (data) => {
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
    chrome.storage.local.set({settings: settings}, () => {
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
    if (key == "saveFiles" || key == "autoParse") {
      document.querySelector("#form-" + key + "-" + settings[key]).checked = true;
      if (key == "saveFiles") onSaveFilesChange(settings[key] == "Y")
    } else if (key == "fromLogo") {
      document.querySelector("#form-from-logo-label").innerHTML = (settings[key] && settings[key].data) ? "Choose a different logo" : "Choose a logo (optional)";
    } else {
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
let updateSettings = async (e) => {
  e.preventDefault();
  let data = {};
  let form_data = new FormData(e.target);
  
  form_data.forEach((v, k) => data[k] = v);
  if (data.fromLogo && data.fromLogo.size > 0 && saveFromLogo) {
    let fr = new FileReader();
    fr.onload = (e) => { //Once the file is uploaded, create the image
      let img = new Image(); //Create the image
      img.onload = (e2) => { //Once the image loads, resize it and save
        let canvas = document.createElement("canvas");
        chrome.storage.local.getBytesInUse(null, (bytes) => {
          let bytesLeft = chrome.storage.local.QUOTA_BYTES - bytes;
          let imgSize = data.fromLogo.size;
          let w = Math.min(img.width, bytesLeft/imgSize * img.width);
          let h = Math.min(img.height, bytesLeft/imgSize * img.height);
          if (w>h) {
            h = 500 * h / w;
            w = 500;
          } else {
            w = 500 * w / h;
            h = 500;
          }
          console.log(w, h);
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          data.fromLogo = {
            data: canvas.toDataURL("image/jpeg"),
            width: w,
            height: h
          };
          updateSettingsMemory(data);
        });
      };
      img.src = e.target.result;
    }
    fr.readAsDataURL(data.fromLogo);
  } else {
    if (!saveFromLogo) { //Clear the logo field
      delete data.fromLogo;
    }
    updateSettingsMemory(data);
  }
}

let updateSettingsMemory = (data) => {
  if (validateSettings(data)) {
    saveSettings(data).then(() => {
      document.querySelector("#info-msg").innerHTML = "Settings updated";
      document.querySelector("#info-msg").classList = "text-info";
      if (saveFromLogo) document.querySelector("#form-from-logo-label").innerHTML = "Choose a different logo";
    }).catch((err) => {
      console.log("Error while updating settings ", err.message);
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
          && (settings.autoParse == "Y" || settings.autoParse == "N")
}



window.onload = () => { //Add event listeners
  document.querySelector("#settings-form").onsubmit = (e) => updateSettings(e);
  document.querySelector("#form-saveFiles-Y").onchange = () => onSaveFilesChange(true);
  document.querySelector("#form-saveFiles-N").onchange = () => onSaveFilesChange(false);
  document.querySelector("#form-from-logo").onchange = () => {
    saveFromLogo = true;
    document.querySelector("#form-from-logo-label").innerHTML = "Save settings to upload";
  }
  document.querySelector("#form-from-logo-clear").onclick = () => {
    saveFromLogo = false;
    document.querySelector("#form-from-logo-label").innerHTML = "Choose a logo (optional)";
  }
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
