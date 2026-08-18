import './style.css';
import { ScenarioRunner } from './cvEngine.js';
import { renderCCTV } from './canvasRenderer.js';
import { telegramDispatcher } from './telegram.js';
import { sound } from './sound.js';
import { SafeRouteEngine } from './safeRouteEngine.js';
import { LeafletMapRenderer } from './leafletMap.js';
import { reportStore } from './reportStore.js';
import { AIReportClassifier } from './aiClassifier.js';
import { SAFETY_CONFIG } from './safetyConfig.js';
import { VoicePanicEngine, SUPPORTED_LANGUAGES } from './voicePanicEngine.js';

// ================= TAB SWITCHING =================
const tabGuardianEye = document.getElementById('tabGuardianEye');
const tabSafeRoute = document.getElementById('tabSafeRoute');
const viewGuardianEye = document.getElementById('viewGuardianEye');
const viewSafeRoute = document.getElementById('viewSafeRoute');

function switchToSafeRoute() {
  tabSafeRoute.classList.add('active');
  tabGuardianEye.classList.remove('active');
  viewSafeRoute.classList.add('active');
  viewGuardianEye.classList.remove('active');
  setTimeout(() => {
    if (safeRouteMapRenderer && safeRouteMapRenderer.map) {
      safeRouteMapRenderer.map.invalidateSize();
    }
  }, 100);
}

function switchToGuardianEye() {
  tabGuardianEye.classList.add('active');
  tabSafeRoute.classList.remove('active');
  viewGuardianEye.classList.add('active');
  viewSafeRoute.classList.remove('active');
}

tabSafeRoute.addEventListener('click', switchToSafeRoute);
tabGuardianEye.addEventListener('click', switchToGuardianEye);

// ================= SAFEROUTE ENGINE & MAP INITIALIZATION =================
const safeRouteEngine = new SafeRouteEngine();

// Initialize Leaflet Map
const safeRouteMapRenderer = new LeafletMapRenderer('safeRouteLeafletMap', {
  onMapClick: handleMapClick,
  onSelectRoute: (idx) => {
    safeRouteEngine.selectedRouteIndex = idx;
    renderSafeRouteUI();
  },
  onReportAction: () => {
    renderSafeRouteUI();
    renderCommunityReportsDrawer();
  }
});

// ================= INTERFACE 1 & 2 SCREEN ELEMENTS =================
const interfaceTripInput = document.getElementById('interfaceTripInput');
const interfaceRouteResult = document.getElementById('interfaceRouteResult');
const tripInputForm = document.getElementById('tripInputForm');
const btnFindSafestRoute = document.getElementById('btnFindSafestRoute');
const findBtnText = document.getElementById('findBtnText');
const btnBackToInput = document.getElementById('btnBackToInput');

// Summary Bar Elements (Interface 2)
const summaryLocations = document.getElementById('summaryLocations');
const summaryModeChip = document.getElementById('summaryModeChip');
const summaryTimeChip = document.getElementById('summaryTimeChip');

// Inputs & Autocomplete Elements
const sourceInput = document.getElementById('sourceInput');
const destInput = document.getElementById('destInput');
const sourceSuggestions = document.getElementById('sourceSuggestions');
const destSuggestions = document.getElementById('destSuggestions');
const sourceCoordDisplay = document.getElementById('sourceCoordDisplay');
const destCoordDisplay = document.getElementById('destCoordDisplay');
const btnGpsSource = document.getElementById('btnGpsSource');
const travelTimeSelect = document.getElementById('travelTimeSelect');

// Deviation Alert
const deviationAlertBanner = document.getElementById('deviationAlertBanner');
const btnRecalculateOffRoute = document.getElementById('btnRecalculateOffRoute');

// Result Screen Sidebar Elements
const routesListContainer = document.getElementById('routesListContainer');
const whyRouteCard = document.getElementById('whyRouteCard');
const whyCardTitle = document.getElementById('whyCardTitle');
const whyScoreBadge = document.getElementById('whyScoreBadge');
const factorsMatrix = document.getElementById('factorsMatrix');
const positiveReasonsList = document.getElementById('positiveReasonsList');
const riskWarningsList = document.getElementById('riskWarningsList');
const btnStartNavigation = document.getElementById('btnStartNavigation');
const btnShareRoute = document.getElementById('btnShareRoute');

// Toggles & Modal Elements
const heatmapToggleBtn = document.getElementById('heatmapToggleBtn');
const facilitiesToggleBtn = document.getElementById('facilitiesToggleBtn');
const openReportsDrawerBtn = document.getElementById('openReportsDrawerBtn');
const reportsCountBadge = document.getElementById('reportsCountBadge');
const reportsDrawer = document.getElementById('reportsDrawer');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const communityReportsList = document.getElementById('communityReportsList');

const btnHeaderReportModal = document.getElementById('btnHeaderReportModal');
const btnResultReportModal = document.getElementById('btnResultReportModal');
const reportModal = document.getElementById('reportModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelReportBtn = document.getElementById('cancelReportBtn');
const reportForm = document.getElementById('reportForm');
const btnReportUseGps = document.getElementById('btnReportUseGps');
const btnReportPickOnMap = document.getElementById('btnReportPickOnMap');
const reportLatReadout = document.getElementById('reportLatReadout');
const reportLngReadout = document.getElementById('reportLngReadout');
const reportLocationName = document.getElementById('reportLocationName');
const reportCategory = document.getElementById('reportCategory');
const reportSeverity = document.getElementById('reportSeverity');
const reportDesc = document.getElementById('reportDesc');
const aiClassificationChip = document.getElementById('aiClassificationChip');
const reportPhotoInput = document.getElementById('reportPhotoInput');
const photoPreviewContainer = document.getElementById('photoPreviewContainer');
const photoPreviewImg = document.getElementById('photoPreviewImg');
const btnRemovePhoto = document.getElementById('btnRemovePhoto');

// ================= MULTILINGUAL HANDS-FREE VOICE SOS =================
const btnOpenVoiceSettings = document.getElementById('btnOpenVoiceSettings');
const headerVoiceLabel = document.getElementById('headerVoiceLabel');
const voicePanicStatusTag = document.getElementById('voicePanicStatusTag');
const btnInputVoiceToggle = document.getElementById('btnInputVoiceToggle');
const btnOpenVoiceSettingsPromo = document.getElementById('btnOpenVoiceSettingsPromo');

// Voice Settings Modal Elements
const voiceSettingsModal = document.getElementById('voiceSettingsModal');
const closeVoiceSettingsBtn = document.getElementById('closeVoiceSettingsBtn');
const btnDoneVoiceSettings = document.getElementById('btnDoneVoiceSettings');
const voiceLangSelect = document.getElementById('voiceLangSelect');
const modalVoiceStatusPill = document.getElementById('modalVoiceStatusPill');
const btnModalToggleVoice = document.getElementById('btnModalToggleVoice');
const phrasesCardsContainer = document.getElementById('phrasesCardsContainer');
const btnResetPhrases = document.getElementById('btnResetPhrases');
const btnOpenAddPhraseModal = document.getElementById('btnOpenAddPhraseModal');

// Add / Edit Phrase Modal Elements
const addPhraseModal = document.getElementById('addPhraseModal');
const addPhraseModalTitle = document.getElementById('addPhraseModalTitle');
const closeAddPhraseModalBtn = document.getElementById('closeAddPhraseModalBtn');
const btnCancelAddPhrase = document.getElementById('btnCancelAddPhrase');
const addPhraseForm = document.getElementById('addPhraseForm');
const editPhraseId = document.getElementById('editPhraseId');
const inputCustomPhrase = document.getElementById('inputCustomPhrase');
const selectPhraseLangTag = document.getElementById('selectPhraseLangTag');
const addPhraseErrorMsg = document.getElementById('addPhraseErrorMsg');
const btnSavePhraseSubmit = document.getElementById('btnSavePhraseSubmit');

// 5-Second Voice SOS Countdown Modal Elements
const voiceCountdownModal = document.getElementById('voiceCountdownModal');
const detectedPhraseText = document.getElementById('detectedPhraseText');
const countdownNumber = document.getElementById('countdownNumber');
const countdownNoticeSecs = document.getElementById('countdownNoticeSecs');
const btnCancelVoiceCountdown = document.getElementById('btnCancelVoiceCountdown');

// SOS Modal Elements
const openSosBtn = document.getElementById('openSosBtn');
const sosModal = document.getElementById('sosModal');
const closeSosModalBtn = document.getElementById('closeSosModalBtn');
const sosGpsCoords = document.getElementById('sosGpsCoords');
const sosTriggerSourceName = document.getElementById('sosTriggerSourceName');
const btnSimulateContactSms = document.getElementById('btnSimulateContactSms');
const sosDispatchStatus = document.getElementById('sosDispatchStatus');
const btnDismissSos = document.getElementById('btnDismissSos');

// Emergency Contacts Elements
const btnEditContacts = document.getElementById('btnEditContacts');
const contactsDisplayList = document.getElementById('contactsDisplayList');
const contactsEditForm = document.getElementById('contactsEditForm');
const contactName1 = document.getElementById('contactName1');
const contactPhone1 = document.getElementById('contactPhone1');
const contactName2 = document.getElementById('contactName2');
const contactPhone2 = document.getElementById('contactPhone2');
const btnSaveContacts = document.getElementById('btnSaveContacts');

// State for exact report coordinate picking
let currentReportCoords = { lat: 17.4435, lng: 78.3772 };
let activePhotoDataUrl = null;
let navigationSimulationInterval = null;

// ================= INITIALIZE VOICE SOS ENGINE =================
const voicePanicEngine = new VoicePanicEngine({
  onStatusChange: (status, label) => {
    updateVoicePanicStatusUI(status, label);
  },
  onCountdownTick: (secondsRemaining, phrase) => {
    detectedPhraseText.textContent = `"${phrase}"`;
    countdownNumber.textContent = secondsRemaining;
    countdownNoticeSecs.textContent = secondsRemaining;
    voiceCountdownModal.classList.remove('hidden');
    sound.playCountdownChime(secondsRemaining);
  },
  onEmergencyTriggered: (phrase) => {
    voiceCountdownModal.classList.add('hidden');
    triggerEmergencySos(`Voice Trigger ("${phrase}")`);
  },
  onCancelled: () => {
    voiceCountdownModal.classList.add('hidden');
    sound.playBeep(440, 0.15);
  }
});

// Sync Voice Language Selection with engine
voiceLangSelect.value = voicePanicEngine.currentLanguage;
voiceLangSelect.addEventListener('change', () => {
  voicePanicEngine.setLanguage(voiceLangSelect.value);
});

function updateVoicePanicStatusUI(status) {
  if (status === 'LISTENING') {
    headerVoiceLabel.textContent = 'Voice SOS: Active';
    btnOpenVoiceSettings.classList.add('listening');
    
    voicePanicStatusTag.className = 'status-indicator-pill listening';
    voicePanicStatusTag.innerHTML = '<span class="status-dot"></span><span class="status-label">Listening</span>';

    modalVoiceStatusPill.className = 'status-indicator-pill listening';
    modalVoiceStatusPill.innerHTML = '<span class="status-dot"></span><span class="status-label">Listening</span>';
    btnModalToggleVoice.textContent = 'Disable';
    btnModalToggleVoice.className = 'btn-danger-outline-sm';

    if (btnInputVoiceToggle) {
      btnInputVoiceToggle.textContent = 'Disable Voice SOS';
      btnInputVoiceToggle.classList.add('active');
    }
  } else if (status === 'STARTING') {
    modalVoiceStatusPill.className = 'status-indicator-pill off';
    modalVoiceStatusPill.innerHTML = '<span class="status-dot"></span><span class="status-label">Starting...</span>';
  } else if (status === 'PERMISSION_REQUIRED') {
    modalVoiceStatusPill.className = 'status-indicator-pill unsupported';
    modalVoiceStatusPill.innerHTML = '<span class="status-dot"></span><span class="status-label">Permission Required</span>';
    btnModalToggleVoice.textContent = 'Allow Access';
    btnModalToggleVoice.className = 'btn-primary-action-sm';
  } else if (status === 'UNSUPPORTED') {
    headerVoiceLabel.textContent = 'Voice SOS: N/A';
    btnOpenVoiceSettings.classList.remove('listening');

    voicePanicStatusTag.className = 'status-indicator-pill unsupported';
    voicePanicStatusTag.innerHTML = '<span class="status-dot"></span><span class="status-label">Not Supported</span>';

    modalVoiceStatusPill.className = 'status-indicator-pill unsupported';
    modalVoiceStatusPill.innerHTML = '<span class="status-dot"></span><span class="status-label">Browser Unsupported</span>';
    btnModalToggleVoice.textContent = 'Unsupported';
    btnModalToggleVoice.disabled = true;

    if (btnInputVoiceToggle) {
      btnInputVoiceToggle.textContent = 'Browser Unsupported';
      btnInputVoiceToggle.disabled = true;
    }
  } else {
    headerVoiceLabel.textContent = 'Voice SOS';
    btnOpenVoiceSettings.classList.remove('listening');

    voicePanicStatusTag.className = 'status-indicator-pill off';
    voicePanicStatusTag.innerHTML = '<span class="status-dot"></span><span class="status-label">Disabled</span>';

    modalVoiceStatusPill.className = 'status-indicator-pill off';
    modalVoiceStatusPill.innerHTML = '<span class="status-dot"></span><span class="status-label">Disabled</span>';
    btnModalToggleVoice.textContent = 'Enable';
    btnModalToggleVoice.className = 'btn-primary-action-sm';

    if (btnInputVoiceToggle) {
      btnInputVoiceToggle.textContent = 'Enable Voice SOS';
      btnInputVoiceToggle.classList.remove('active');
    }
  }
}

// Open / Close Voice SOS Settings Modal
function openVoiceSettingsModal() {
  voiceLangSelect.value = voicePanicEngine.currentLanguage;
  renderPhrasesList();
  voiceSettingsModal.classList.remove('hidden');
}

btnOpenVoiceSettings.addEventListener('click', openVoiceSettingsModal);
if (btnOpenVoiceSettingsPromo) {
  btnOpenVoiceSettingsPromo.addEventListener('click', openVoiceSettingsModal);
}
closeVoiceSettingsBtn.addEventListener('click', () => voiceSettingsModal.classList.add('hidden'));
btnDoneVoiceSettings.addEventListener('click', () => voiceSettingsModal.classList.add('hidden'));

// Toggle Voice SOS from Modal
btnModalToggleVoice.addEventListener('click', () => {
  if (!voicePanicEngine.isSupported) {
    alert("Hands-Free Voice SOS is not supported by your current browser. Please use Chrome or Edge for Web Speech API support.");
    return;
  }
  voicePanicEngine.toggle();
});

// Quick toggle from Interface 1 card
if (btnInputVoiceToggle) {
  btnInputVoiceToggle.addEventListener('click', () => {
    if (!voicePanicEngine.isSupported) {
      alert("Hands-Free Voice SOS is not supported by your current browser. Please use Chrome or Edge for Web Speech API support.");
      return;
    }
    voicePanicEngine.toggle();
  });
}

// Cancel 5-second countdown
btnCancelVoiceCountdown.addEventListener('click', () => {
  voicePanicEngine.cancelCountdown();
});

// ================= EMERGENCY PHRASES MANAGEMENT =================
function renderPhrasesList() {
  const phrases = voicePanicEngine.getPhrases();
  phrasesCardsContainer.innerHTML = '';

  const langNames = {
    'all': 'Universal / All',
    'en-US': 'English',
    'hi-IN': 'Hindi / Hinglish',
    'te-IN': 'Telugu',
    'ta-IN': 'Tamil',
    'kn-IN': 'Kannada',
    'mr-IN': 'Marathi',
    'es-ES': 'Spanish'
  };

  phrases.forEach((item) => {
    const card = document.createElement('div');
    card.className = `phrase-item-card ${item.enabled ? 'active' : 'disabled'}`;
    const langLabel = langNames[item.lang] || item.lang || 'All';

    card.innerHTML = `
      <div class="phrase-left-group">
        <label class="phrase-checkbox-wrap" title="Toggle active phrase">
          <input type="checkbox" class="phrase-toggle-input" ${item.enabled ? 'checked' : ''} />
          <span class="phrase-text">"${item.phrase}"</span>
        </label>
        <span class="phrase-lang-tag">${langLabel}</span>
      </div>
      <div class="phrase-actions-group">
        <button type="button" class="btn-phrase-tool btn-edit-phrase" title="Edit phrase">Edit</button>
        <button type="button" class="btn-phrase-tool btn-del-phrase" title="Delete phrase">Delete</button>
      </div>
    `;

    // Toggle Enabled
    const checkbox = card.querySelector('.phrase-toggle-input');
    checkbox.addEventListener('change', () => {
      voicePanicEngine.togglePhrase(item.id);
      renderPhrasesList();
    });

    // Edit Phrase
    const btnEdit = card.querySelector('.btn-edit-phrase');
    btnEdit.addEventListener('click', () => {
      editPhraseId.value = item.id;
      inputCustomPhrase.value = item.phrase;
      selectPhraseLangTag.value = item.lang || 'all';
      addPhraseModalTitle.textContent = 'Edit Emergency Trigger Phrase';
      addPhraseErrorMsg.classList.add('hidden');
      addPhraseModal.classList.remove('hidden');
    });

    // Delete Phrase
    const btnDel = card.querySelector('.btn-del-phrase');
    btnDel.addEventListener('click', () => {
      voicePanicEngine.deletePhrase(item.id);
      renderPhrasesList();
    });

    phrasesCardsContainer.appendChild(card);
  });
}

// Reset Phrases to Defaults
btnResetPhrases.addEventListener('click', () => {
  if (confirm("Restore default multilingual emergency trigger phrases?")) {
    voicePanicEngine.resetToDefaults();
    renderPhrasesList();
  }
});

// Add Phrase Modal Handlers
btnOpenAddPhraseModal.addEventListener('click', () => {
  editPhraseId.value = '';
  inputCustomPhrase.value = '';
  selectPhraseLangTag.value = voicePanicEngine.currentLanguage || 'all';
  addPhraseModalTitle.textContent = 'Add Emergency Trigger Phrase';
  addPhraseErrorMsg.classList.add('hidden');
  addPhraseModal.classList.remove('hidden');
});

closeAddPhraseModalBtn.addEventListener('click', () => addPhraseModal.classList.add('hidden'));
btnCancelAddPhrase.addEventListener('click', () => addPhraseModal.classList.add('hidden'));

addPhraseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputCustomPhrase.value.trim();
  const lang = selectPhraseLangTag.value;
  const id = editPhraseId.value;

  if (!text) {
    addPhraseErrorMsg.textContent = 'Please enter an emergency phrase.';
    addPhraseErrorMsg.classList.remove('hidden');
    return;
  }

  if (id) {
    // Editing existing phrase
    const res = voicePanicEngine.updatePhrase(id, text);
    if (!res.success) {
      addPhraseErrorMsg.textContent = res.error;
      addPhraseErrorMsg.classList.remove('hidden');
      return;
    }
  } else {
    // Adding new phrase
    const res = voicePanicEngine.addPhrase(text, lang);
    if (!res.success) {
      addPhraseErrorMsg.textContent = res.error;
      addPhraseErrorMsg.classList.remove('hidden');
      return;
    }
  }

  addPhraseModal.classList.add('hidden');
  renderPhrasesList();
});

// ================= EMERGENCY SOS DISPATCH =================
function triggerEmergencySos(sourceDescription = 'MANUAL SOS BUTTON') {
  sosTriggerSourceName.textContent = sourceDescription.toUpperCase();
  sosGpsCoords.textContent = 'Fetching current real-time GPS location...';
  sosModal.classList.remove('hidden');
  sound.playSiren();

  // Obtain Current Real GPS Location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 10);
        sosGpsCoords.textContent = `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E (±${accuracy}m)`;
        safeRouteMapRenderer.updateUserLocation(lat, lng);
      },
      (err) => {
        sosGpsCoords.textContent = `Unable to obtain current GPS location (${err.message})`;
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    sosGpsCoords.textContent = 'Geolocation is not supported by this browser';
  }
}

openSosBtn.addEventListener('click', () => {
  triggerEmergencySos('MANUAL SOS BUTTON');
});

closeSosModalBtn.addEventListener('click', () => {
  sosModal.classList.add('hidden');
  voicePanicEngine.resumeAfterEmergency();
});

btnDismissSos.addEventListener('click', () => {
  sosModal.classList.add('hidden');
  voicePanicEngine.resumeAfterEmergency();
});

// Emergency Contacts Management (localStorage)
function loadEmergencyContacts() {
  const saved = localStorage.getItem('saferoute_emergency_contacts_v2');
  if (saved) {
    try {
      const contacts = JSON.parse(saved);
      if (Array.isArray(contacts) && contacts.length >= 2) {
        contactName1.value = contacts[0].name || 'Primary Contact';
        contactPhone1.value = contacts[0].phone || '+91 98765 43210';
        contactName2.value = contacts[1].name || 'Secondary Contact';
        contactPhone2.value = contacts[1].phone || '+91 91234 56789';

        contactsDisplayList.innerHTML = `
          <span class="contact-pill-clean">${contacts[0].name}: ${contacts[0].phone}</span>
          <span class="contact-pill-clean">${contacts[1].name}: ${contacts[1].phone}</span>
        `;
      }
    } catch (e) {}
  }
}
loadEmergencyContacts();

btnEditContacts.addEventListener('click', () => {
  contactsEditForm.classList.toggle('hidden');
});

btnSaveContacts.addEventListener('click', () => {
  const c1 = { name: contactName1.value.trim() || 'Primary Contact', phone: contactPhone1.value.trim() || '+91 98765 43210' };
  const c2 = { name: contactName2.value.trim() || 'Secondary Contact', phone: contactPhone2.value.trim() || '+91 91234 56789' };
  
  localStorage.setItem('saferoute_emergency_contacts_v2', JSON.stringify([c1, c2]));
  contactsDisplayList.innerHTML = `
    <span class="contact-pill-clean">${c1.name}: ${c1.phone}</span>
    <span class="contact-pill-clean">${c2.name}: ${c2.phone}</span>
  `;
  contactsEditForm.classList.add('hidden');
  alert("Emergency contacts updated.");
});

btnSimulateContactSms.addEventListener('click', () => {
  btnSimulateContactSms.disabled = true;
  btnSimulateContactSms.textContent = 'Transmitting Emergency SOS...';
  setTimeout(() => {
    btnSimulateContactSms.disabled = false;
    btnSimulateContactSms.textContent = 'Send Emergency SMS with Live Location to Contacts';
    const p1 = contactPhone1.value || '+91 98765 43210';
    const p2 = contactPhone2.value || '+91 91234 56789';
    sosDispatchStatus.textContent = `Emergency broadcast sent to [${p1}] and [${p2}] with your live GPS coordinates.`;
    sosDispatchStatus.classList.remove('hidden');
  }, 1200);
});

// ================= DYNAMIC GEOCODING & AUTOCOMPLETE =================
let sourceDebounce = null;
sourceInput.addEventListener('input', () => {
  clearTimeout(sourceDebounce);
  const q = sourceInput.value.trim();
  if (q.length < 2) {
    sourceSuggestions.classList.add('hidden');
    return;
  }
  sourceDebounce = setTimeout(async () => {
    try {
      const results = await safeRouteEngine.geocode(q);
      renderSuggestions(results, sourceSuggestions, (item) => {
        sourceInput.value = item.name;
        safeRouteEngine.origin = { name: item.name, lat: item.lat, lng: item.lng };
        sourceCoordDisplay.textContent = `(${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`;
        sourceSuggestions.classList.add('hidden');
      });
    } catch (e) {
      console.warn("Source geocode:", e);
    }
  }, 350);
});

let destDebounce = null;
destInput.addEventListener('input', () => {
  clearTimeout(destDebounce);
  const q = destInput.value.trim();
  if (q.length < 2) {
    destSuggestions.classList.add('hidden');
    return;
  }
  destDebounce = setTimeout(async () => {
    try {
      const results = await safeRouteEngine.geocode(q);
      renderSuggestions(results, destSuggestions, (item) => {
        destInput.value = item.name;
        safeRouteEngine.destination = { name: item.name, lat: item.lat, lng: item.lng };
        destCoordDisplay.textContent = `(${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`;
        destSuggestions.classList.add('hidden');
      });
    } catch (e) {
      console.warn("Dest geocode:", e);
    }
  }, 350);
});

function renderSuggestions(list, container, onSelect) {
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.classList.add('hidden');
    return;
  }
  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item-clean';
    div.innerHTML = `
      <div class="suggestion-title">${item.name}</div>
      <div class="suggestion-sub">${item.fullName}</div>
    `;
    div.addEventListener('click', () => onSelect(item));
    container.appendChild(div);
  });
  container.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  if (!sourceInput.contains(e.target) && !sourceSuggestions.contains(e.target)) {
    sourceSuggestions.classList.add('hidden');
  }
  if (!destInput.contains(e.target) && !destSuggestions.contains(e.target)) {
    destSuggestions.classList.add('hidden');
  }
});

// ================= GPS SOURCE BUTTON =================
btnGpsSource.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  btnGpsSource.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      btnGpsSource.disabled = false;
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const name = await safeRouteEngine.reverseGeocode(lat, lng);
      sourceInput.value = name;
      safeRouteEngine.origin = { name, lat, lng };
      sourceCoordDisplay.textContent = `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      safeRouteMapRenderer.updateUserLocation(lat, lng);
    },
    (err) => {
      btnGpsSource.disabled = false;
      alert(`Unable to retrieve GPS: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

// ================= TRAVEL MODE SELECTION =================
const travelModeButtons = document.querySelectorAll('.travel-mode-card');
travelModeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    travelModeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    safeRouteEngine.travelMode = btn.dataset.mode || 'car';
  });
});

// ================= TRAVEL TIME SELECTION =================
travelTimeSelect.addEventListener('change', () => {
  safeRouteEngine.travelTime = travelTimeSelect.value || 'now';
});

// ================= PRESETS HANDLER =================
document.querySelectorAll('.preset-pill-clean').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-pill-clean').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const p = btn.dataset.preset;
    if (p === 'hyd_hitech_banjara') {
      safeRouteEngine.origin = { name: "Hitech City, Hyderabad", lat: 17.4435, lng: 78.3772 };
      safeRouteEngine.destination = { name: "Banjara Hills, Hyderabad", lat: 17.4150, lng: 78.4350 };
    } else if (p === 'blr_mg_indiranagar') {
      safeRouteEngine.origin = { name: "MG Road, Bengaluru", lat: 12.9756, lng: 77.6066 };
      safeRouteEngine.destination = { name: "Indiranagar 100ft Rd, Bengaluru", lat: 12.9784, lng: 77.6408 };
    } else if (p === 'del_cp_saket') {
      safeRouteEngine.origin = { name: "Connaught Place, Delhi", lat: 28.6315, lng: 77.2167 };
      safeRouteEngine.destination = { name: "Saket District Centre, Delhi", lat: 28.5245, lng: 77.2066 };
    } else if (p === 'mum_bkc_bandra') {
      safeRouteEngine.origin = { name: "Bandra Kurla Complex (BKC), Mumbai", lat: 19.0664, lng: 72.8681 };
      safeRouteEngine.destination = { name: "Bandra Bandstand, Mumbai", lat: 19.0515, lng: 72.8288 };
    }

    sourceInput.value = safeRouteEngine.origin.name;
    sourceCoordDisplay.textContent = `(${safeRouteEngine.origin.lat.toFixed(4)}, ${safeRouteEngine.origin.lng.toFixed(4)})`;
    destInput.value = safeRouteEngine.destination.name;
    destCoordDisplay.textContent = `(${safeRouteEngine.destination.lat.toFixed(4)}, ${safeRouteEngine.destination.lng.toFixed(4)})`;
  });
});

// ================= FIND SAFEST ROUTE (INTERFACE 1 -> INTERFACE 2) =================
tripInputForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleFindSafeRoutes();
});

btnFindSafestRoute.addEventListener('click', async (e) => {
  e.preventDefault();
  await handleFindSafeRoutes();
});

async function handleFindSafeRoutes() {
  findBtnText.textContent = 'Calculating Safe Routes...';
  btnFindSafestRoute.disabled = true;

  try {
    if (sourceInput.value && (!safeRouteEngine.origin || safeRouteEngine.origin.name !== sourceInput.value)) {
      const s = await safeRouteEngine.geocode(sourceInput.value);
      if (s[0]) safeRouteEngine.origin = { name: s[0].name, lat: s[0].lat, lng: s[0].lng };
    }
    if (destInput.value && (!safeRouteEngine.destination || safeRouteEngine.destination.name !== destInput.value)) {
      const d = await safeRouteEngine.geocode(destInput.value);
      if (d[0]) safeRouteEngine.destination = { name: d[0].name, lat: d[0].lat, lng: d[0].lng };
    }

    await safeRouteEngine.calculateRoutes();

    interfaceTripInput.classList.add('hidden');
    interfaceRouteResult.classList.remove('hidden');

    summaryLocations.innerHTML = `
      <span class="loc-text origin">${safeRouteEngine.origin.name}</span>
      <svg class="arrow-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      <span class="loc-text destination">${safeRouteEngine.destination.name}</span>
    `;

    const modeLabels = { car: 'Car', bike: 'Bike', auto: 'Auto', walking: 'Walking' };
    summaryModeChip.textContent = modeLabels[safeRouteEngine.travelMode] || 'Car';
    
    const timeLabels = {
      now: 'Now',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night'
    };
    summaryTimeChip.textContent = timeLabels[safeRouteEngine.travelTime] || 'Now';

    setTimeout(() => {
      if (safeRouteMapRenderer && safeRouteMapRenderer.map) {
        safeRouteMapRenderer.map.invalidateSize();
      }
      renderSafeRouteUI();
    }, 100);

    sound.playBeep(880, 0.1);
  } catch (err) {
    alert(`Routing error: ${err.message}`);
  } finally {
    findBtnText.textContent = 'Find Safest Route';
    btnFindSafestRoute.disabled = false;
  }
}

// ================= BACK TO INTERFACE 1 =================
btnBackToInput.addEventListener('click', () => {
  interfaceRouteResult.classList.add('hidden');
  interfaceTripInput.classList.remove('hidden');
});

// ================= MAP CLICK HANDLER =================
async function handleMapClick(lat, lng, mode) {
  if (mode === 'report') {
    currentReportCoords = { lat, lng };
    reportLatReadout.textContent = lat.toFixed(6);
    reportLngReadout.textContent = lng.toFixed(6);
    const name = await safeRouteEngine.reverseGeocode(lat, lng);
    reportLocationName.value = name;
    safeRouteMapRenderer.setPickingMode('none');
    reportModal.classList.remove('hidden');
  }
}

// ================= TOGGLES (HEATMAP, FACILITIES) =================
heatmapToggleBtn.addEventListener('click', () => {
  const willShow = !safeRouteMapRenderer.showHeatmap;
  safeRouteMapRenderer.toggleHeatmap(willShow);
  if (willShow) {
    heatmapToggleBtn.querySelector('span').textContent = 'Heatmap: ON';
    heatmapToggleBtn.classList.add('active');
  } else {
    heatmapToggleBtn.querySelector('span').textContent = 'Heatmap: OFF';
    heatmapToggleBtn.classList.remove('active');
  }
});

facilitiesToggleBtn.addEventListener('click', () => {
  const willShow = !safeRouteMapRenderer.showFacilities;
  safeRouteMapRenderer.toggleFacilities(willShow);
  if (willShow) {
    facilitiesToggleBtn.querySelector('span').textContent = 'Facilities: ON';
    facilitiesToggleBtn.classList.add('active');
  } else {
    facilitiesToggleBtn.querySelector('span').textContent = 'Facilities: OFF';
    facilitiesToggleBtn.classList.remove('active');
  }
  safeRouteMapRenderer.render(safeRouteEngine);
});

// ================= RENDER SAFEROUTE UI =================
function renderSafeRouteUI() {
  routesListContainer.innerHTML = '';
  const routes = safeRouteEngine.routes || [];

  if (safeRouteEngine.error || routes.length === 0) {
    routesListContainer.innerHTML = `
      <div class="empty-state-notice">
        <strong>${safeRouteEngine.error || "Unable to find a valid road route. Please try another location."}</strong>
      </div>
    `;
    whyRouteCard.style.display = 'none';
    safeRouteMapRenderer.render(safeRouteEngine);
    return;
  }

  whyRouteCard.style.display = 'flex';

  if (safeRouteEngine.allHighRiskWarning) {
    const warnDiv = document.createElement('div');
    warnDiv.className = 'clean-alert-box danger';
    warnDiv.innerHTML = `<span>${safeRouteEngine.allHighRiskWarning}</span>`;
    routesListContainer.appendChild(warnDiv);
  } else if (safeRouteEngine.saferLongerNotice) {
    const noticeDiv = document.createElement('div');
    noticeDiv.className = 'clean-alert-box info';
    noticeDiv.innerHTML = `<span>${safeRouteEngine.saferLongerNotice}</span>`;
    routesListContainer.appendChild(noticeDiv);
  }

  routes.forEach((route, idx) => {
    const isSelected = idx === safeRouteEngine.selectedRouteIndex;
    const card = document.createElement('div');
    const typeClass = (route.type || 'safest').toLowerCase();
    card.className = `clean-route-card ${typeClass} ${isSelected ? 'selected' : ''}`;

    card.innerHTML = `
      <div class="route-card-header-clean">
        <span class="route-title-clean">${route.name}</span>
        <span class="route-badge-clean ${typeClass}">${route.badge}</span>
      </div>

      <div class="route-metrics-row-clean">
        <div class="metric-clean">
          <span class="metric-lbl">DISTANCE</span>
          <strong>${route.distanceKm} km</strong>
        </div>
        <div class="metric-clean">
          <span class="metric-lbl">EST. TIME</span>
          <strong>${route.durationMin} min</strong>
        </div>
        <div class="metric-clean">
          <span class="metric-lbl">LIGHTING</span>
          <strong class="${route.lightingPercent >= 75 ? 'metric-good' : 'metric-warn'}">${route.lightingPercent}%</strong>
        </div>
        <div class="metric-clean">
          <span class="metric-lbl">POLICE (1KM)</span>
          <strong class="${route.policeCount > 0 ? 'metric-good' : 'metric-dim'}">${route.policeCount} nearby</strong>
        </div>
      </div>

      <div class="route-card-footer-clean">
        <div class="score-display-clean">
          <span class="score-number-tag ${typeClass}">Safety: ${route.safetyScore}/100</span>
          <span class="score-risk-tag">${route.riskLevel}</span>
        </div>
        <button class="btn-select-route-clean ${isSelected ? 'selected' : ''}">
          ${isSelected ? 'Selected' : 'Select Route'}
        </button>
      </div>

      ${route.safetyScore < 40 ? `<div class="route-risk-notice-clean">Passes through reported unsafe zones. DO NOT RECOMMEND when a safer route exists.</div>` : ''}
    `;

    card.addEventListener('click', () => {
      safeRouteEngine.selectedRouteIndex = idx;
      renderSafeRouteUI();
    });

    routesListContainer.appendChild(card);
  });

  if (routes.length === 1) {
    const singleNotice = document.createElement('div');
    singleNotice.className = 'single-route-footnote';
    singleNotice.textContent = 'Only one valid road route was found for this journey.';
    routesListContainer.appendChild(singleNotice);
  }

  const selected = routes[safeRouteEngine.selectedRouteIndex] || routes[0];
  if (selected) {
    whyCardTitle.textContent = `Why: ${selected.badge}`;
    whyScoreBadge.textContent = `${selected.safetyScore}/100 ${selected.scoreLabel}`;
    whyScoreBadge.className = `score-pill-clean ${selected.badgeClass}`;

    factorsMatrix.innerHTML = `
      <div class="factor-chip-clean">
        <span class="chip-lbl">Street Lighting</span>
        <span class="chip-val ${selected.lightingPercent >= 75 ? 'good' : 'warn'}">${selected.lightingPercent}% Verified</span>
      </div>
      <div class="factor-chip-clean">
        <span class="chip-lbl">Police Proximity</span>
        <span class="chip-val">${selected.policeCount} within 1km ${selected.nearestPolice ? `(${selected.nearestPolice.distanceMeters}m)` : ''}</span>
      </div>
      <div class="factor-chip-clean">
        <span class="chip-lbl">Medical Facilities</span>
        <span class="chip-val">${selected.hospitalCount} within 1km ${selected.nearestHospital ? `(${selected.nearestHospital.distanceMeters}m)` : ''}</span>
      </div>
      <div class="factor-chip-clean">
        <span class="chip-lbl">Foot Traffic</span>
        <span class="chip-val">${selected.publicActivityLevel} Activity</span>
      </div>
    `;

    positiveReasonsList.innerHTML = '';
    selected.reasonsWhy.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = r;
      positiveReasonsList.appendChild(li);
    });

    riskWarningsList.innerHTML = '';
    selected.riskWarnings.forEach((w) => {
      const li = document.createElement('li');
      li.textContent = w;
      riskWarningsList.appendChild(li);
    });
  }

  safeRouteMapRenderer.render(safeRouteEngine);
}

// ================= GPS NAVIGATION SIMULATION =================
btnStartNavigation.addEventListener('click', () => {
  if (navigationSimulationInterval) {
    clearInterval(navigationSimulationInterval);
    navigationSimulationInterval = null;
    btnStartNavigation.textContent = 'Start GPS Navigation Simulation';
    btnStartNavigation.classList.remove('active');
    deviationAlertBanner.classList.add('hidden');
    return;
  }

  const selected = safeRouteEngine.routes[safeRouteEngine.selectedRouteIndex];
  if (!selected || !selected.path || selected.path.length < 2) return;

  btnStartNavigation.textContent = 'Stop Navigation Simulation';
  btnStartNavigation.classList.add('active');

  let step = 0;
  const path = selected.path;
  navigationSimulationInterval = setInterval(() => {
    if (step >= path.length) {
      clearInterval(navigationSimulationInterval);
      navigationSimulationInterval = null;
      btnStartNavigation.textContent = 'Start GPS Navigation Simulation';
      btnStartNavigation.classList.remove('active');
      sound.playBeep(1200, 0.2);
      alert("Destination reached safely via SafeRoute.");
      return;
    }

    const curr = path[step];
    safeRouteMapRenderer.updateUserLocation(curr.lat, curr.lng);

    const isOffRoute = safeRouteMapRenderer.checkDeviation(curr.lat, curr.lng, path);
    if (isOffRoute) {
      deviationAlertBanner.classList.remove('hidden');
      sound.playBeep(400, 0.3);
    } else {
      deviationAlertBanner.classList.add('hidden');
    }

    step++;
  }, 1200);
});

btnRecalculateOffRoute.addEventListener('click', async () => {
  deviationAlertBanner.classList.add('hidden');
  await safeRouteEngine.calculateRoutes();
  renderSafeRouteUI();
});

btnShareRoute.addEventListener('click', () => {
  const selected = safeRouteEngine.routes[safeRouteEngine.selectedRouteIndex];
  if (!selected) return;
  const shareText = `SafeRoute Itinerary: Taking ${selected.badge} (${selected.distanceKm} km, Safety Score: ${selected.safetyScore}/100) from ${safeRouteEngine.origin.name} to ${safeRouteEngine.destination.name}.`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText);
    alert("SafeRoute itinerary copied to clipboard.");
  } else {
    alert(shareText);
  }
});

// ================= REPORT MODAL & EXACT GPS / PIN PICKING =================
function openReportModal() {
  if (safeRouteEngine.origin) {
    currentReportCoords = { lat: safeRouteEngine.origin.lat, lng: safeRouteEngine.origin.lng };
    reportLatReadout.textContent = currentReportCoords.lat.toFixed(6);
    reportLngReadout.textContent = currentReportCoords.lng.toFixed(6);
  }
  reportModal.classList.remove('hidden');
}

btnHeaderReportModal.addEventListener('click', openReportModal);
btnResultReportModal.addEventListener('click', openReportModal);

closeModalBtn.addEventListener('click', () => reportModal.classList.add('hidden'));
cancelReportBtn.addEventListener('click', () => reportModal.classList.add('hidden'));

btnReportUseGps.addEventListener('click', () => {
  btnReportUseGps.classList.add('active');
  btnReportPickOnMap.classList.remove('active');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      currentReportCoords = { lat, lng };
      reportLatReadout.textContent = lat.toFixed(6);
      reportLngReadout.textContent = lng.toFixed(6);
      const name = await safeRouteEngine.reverseGeocode(lat, lng);
      reportLocationName.value = name;
    });
  }
});

btnReportPickOnMap.addEventListener('click', () => {
  btnReportPickOnMap.classList.add('active');
  btnReportUseGps.classList.remove('active');
  reportModal.classList.add('hidden');
  safeRouteMapRenderer.setPickingMode('report');
  alert("Click anywhere on the map to set the exact coordinates of the hazard.");
});

// AI Description Auto-Classification
let descDebounce = null;
reportDesc.addEventListener('input', () => {
  clearTimeout(descDebounce);
  const text = reportDesc.value.trim();
  if (text.length < 5) {
    aiClassificationChip.classList.add('hidden');
    return;
  }
  descDebounce = setTimeout(() => {
    const classification = AIReportClassifier.classifyText(text);
    if (classification) {
      aiClassificationChip.textContent = `Suggested: ${classification.category} (${classification.severity})`;
      aiClassificationChip.classList.remove('hidden');
      if (classification.category) reportCategory.value = classification.category;
      if (classification.severity) reportSeverity.value = classification.severity;
    }
  }, 400);
});

// Photo upload preview
reportPhotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    activePhotoDataUrl = event.target.result;
    photoPreviewImg.src = activePhotoDataUrl;
    photoPreviewContainer.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

btnRemovePhoto.addEventListener('click', () => {
  activePhotoDataUrl = null;
  reportPhotoInput.value = '';
  photoPreviewContainer.classList.add('hidden');
});

// Submit exact report
reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newRep = {
    locationName: reportLocationName.value.trim() || 'Reported Location',
    latitude: currentReportCoords.lat,
    longitude: currentReportCoords.lng,
    category: reportCategory.value,
    severity: reportSeverity.value,
    description: reportDesc.value.trim(),
    photoUrl: activePhotoDataUrl,
    timestamp: new Date().toISOString()
  };

  reportStore.addReport(newRep);
  reportModal.classList.add('hidden');
  reportForm.reset();
  activePhotoDataUrl = null;
  photoPreviewContainer.classList.add('hidden');
  aiClassificationChip.classList.add('hidden');

  sound.playBeep(600, 0.2);
  alert("Hazard report submitted with exact coordinates.");

  await safeRouteEngine.calculateRoutes();
  renderSafeRouteUI();
  renderCommunityReportsDrawer();
});

// ================= COMMUNITY REPORTS DRAWER =================
openReportsDrawerBtn.addEventListener('click', () => {
  renderCommunityReportsDrawer();
  reportsDrawer.classList.remove('hidden');
});

closeDrawerBtn.addEventListener('click', () => {
  reportsDrawer.classList.add('hidden');
});

function renderCommunityReportsDrawer() {
  const reps = reportStore.getAllReports();
  reportsCountBadge.textContent = reps.length;
  communityReportsList.innerHTML = '';

  if (reps.length === 0) {
    communityReportsList.innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px;">No community reports logged yet.</div>';
    return;
  }

  reps.forEach((rep) => {
    const card = document.createElement('div');
    card.className = 'clean-drawer-report-card';
    const decayWeight = Math.round(reportStore.calculateReportWeight(rep) * 100);
    
    card.innerHTML = `
      <div class="flex-justify-between align-center">
        <strong>${rep.locationName}</strong>
        <span class="report-severity-tag ${rep.severity.toLowerCase()}">${rep.severity}</span>
      </div>
      <div class="report-meta-sub">
        ${rep.category} · (${rep.latitude.toFixed(4)}, ${rep.longitude.toFixed(4)})
      </div>
      <div class="report-desc-text">${rep.description}</div>
      <div class="report-meta-footer">
        <span>Recency Weight: ${decayWeight}%</span>
        <span>${rep.confirmations || 0} confirmations</span>
      </div>
    `;
    communityReportsList.appendChild(card);
  });
}

// ================= GUARDIAN EYE CCTV ENGINE (PRESERVED) =================
const cvRunner = new ScenarioRunner();
const cctvCanvas = document.getElementById('cctvCanvas');
const ctx = cctvCanvas.getContext('2d');
const alertOverlay = document.getElementById('alertOverlay');
const thresholdRange = document.getElementById('thresholdRange');
const thresholdVal = document.getElementById('thresholdVal');
const emotionSelect = document.getElementById('emotionSelect');
const timeToggle = document.getElementById('timeToggle');
const triggerManualSos = document.getElementById('triggerManualSos');
const toggleNightVisionBtn = document.getElementById('toggleNightVisionBtn');

let isNightVision = false;

function cctvLoop() {
  cvRunner.update();
  const state = cvRunner.getState();
  renderCCTV(ctx, state, isNightVision);

  if (state.alert) {
    alertOverlay.classList.remove('hidden');
  } else {
    alertOverlay.classList.add('hidden');
  }

  requestAnimationFrame(cctvLoop);
}
requestAnimationFrame(cctvLoop);

// Initial drawer counts
renderCommunityReportsDrawer();
