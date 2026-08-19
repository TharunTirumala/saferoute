import './style.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import { EmergencySosService, SOS_STATUS } from './emergencySosService.js';
import { liveSosSessionStore } from './liveSosSessionStore.js';

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

// ================= SOS READINESS & SETUP ELEMENTS =================
const btnOpenSosSetup = document.getElementById('btnOpenSosSetup');
const headerSosReadinessPill = document.getElementById('headerSosReadinessPill');
const headerSosReadinessLabel = document.getElementById('headerSosReadinessLabel');

const sosReadinessBanner = document.getElementById('sosReadinessBanner');
const readinessIconBox = document.getElementById('readinessIconBox');
const readinessBannerTitle = document.getElementById('readinessBannerTitle');
const readinessBadgeTag = document.getElementById('readinessBadgeTag');
const readinessBannerSub = document.getElementById('readinessBannerSub');
const btnBannerOpenSetup = document.getElementById('btnBannerOpenSetup');

const sosSetupModal = document.getElementById('sosSetupModal');
const closeSosSetupBtn = document.getElementById('closeSosSetupBtn');
const btnDoneSosSetup = document.getElementById('btnDoneSosSetup');
const setupStatusCard = document.getElementById('setupStatusCard');
const setupStatusDot = document.getElementById('setupStatusDot');
const setupStatusHeadline = document.getElementById('setupStatusHeadline');
const setupStatusSubtext = document.getElementById('setupStatusSubtext');
const setupStatusPill = document.getElementById('setupStatusPill');
const setupStatusPillText = document.getElementById('setupStatusPillText');

const locStatusTag = document.getElementById('locStatusTag');
const btnGrantLocation = document.getElementById('btnGrantLocation');
const micStatusTag = document.getElementById('micStatusTag');
const btnGrantMicrophone = document.getElementById('btnGrantMicrophone');
const notifStatusTag = document.getElementById('notifStatusTag');
const btnGrantNotifications = document.getElementById('btnGrantNotifications');
const contactsStatusTag = document.getElementById('contactsStatusTag');
const contactsCheckDesc = document.getElementById('contactsCheckDesc');
const btnSetupManageContacts = document.getElementById('btnSetupManageContacts');

// Central SOS Elements
const centralSosCountdownModal = document.getElementById('centralSosCountdownModal');
const countdownModalHeading = document.getElementById('countdownModalHeading');
const countdownTriggerSourceName = document.getElementById('countdownTriggerSourceName');
const centralCountdownNumber = document.getElementById('centralCountdownNumber');
const centralCountdownNoticeSecs = document.getElementById('centralCountdownNoticeSecs');
const btnCancelCentralCountdown = document.getElementById('btnCancelCentralCountdown');

const openSosBtn = document.getElementById('openSosBtn');
const sosModal = document.getElementById('sosModal');
const closeSosModalBtn = document.getElementById('closeSosModalBtn');
const sosTriggerSourceName = document.getElementById('sosTriggerSourceName');
const sosGpsStatusBadge = document.getElementById('sosGpsStatusBadge');
const sosGpsCoords = document.getElementById('sosGpsCoords');
const sosGpsTimestamp = document.getElementById('sosGpsTimestamp');
const sosGpsBreadcrumbsCount = document.getElementById('sosGpsBreadcrumbsCount');
const inputLiveUrlDisplay = document.getElementById('inputLiveUrlDisplay');
const btnCopyLiveUrl = document.getElementById('btnCopyLiveUrl');
const btnTestOpenLiveUrl = document.getElementById('btnTestOpenLiveUrl');

const btnCallPrimaryContactNow = document.getElementById('btnCallPrimaryContactNow');
const btnSendEmergencyMessageNow = document.getElementById('btnSendEmergencyMessageNow');
const sosActiveContactsList = document.getElementById('sosActiveContactsList');
const btnEditContactsInSos = document.getElementById('btnEditContactsInSos');
const sosDispatchStatus = document.getElementById('sosDispatchStatus');
const btnDismissSos = document.getElementById('btnDismissSos');

// Contacts Manager Modal Elements
const btnOpenContactsManager = document.getElementById('btnOpenContactsManager');
const contactsCountBadge = document.getElementById('contactsCountBadge');
const contactsManagerModal = document.getElementById('contactsManagerModal');
const closeContactsManagerBtn = document.getElementById('closeContactsManagerBtn');
const btnDoneContactsManager = document.getElementById('btnDoneContactsManager');
const btnOpenAddContactForm = document.getElementById('btnOpenAddContactForm');
const addContactInlineForm = document.getElementById('addContactInlineForm');
const contactFormTitle = document.getElementById('contactFormTitle');
const editContactId = document.getElementById('editContactId');
const inputContactName = document.getElementById('inputContactName');
const inputContactPhone = document.getElementById('inputContactPhone');
const inputContactRelation = document.getElementById('inputContactRelation');
const checkContactIsPrimary = document.getElementById('checkContactIsPrimary');
const contactFormError = document.getElementById('contactFormError');
const btnCancelContactForm = document.getElementById('btnCancelContactForm');
const btnSaveContactSubmit = document.getElementById('btnSaveContactSubmit');
const contactsManagerList = document.getElementById('contactsManagerList');

// Voice SOS Modal Elements
const btnOpenVoiceSettings = document.getElementById('btnOpenVoiceSettings');
const headerVoiceLabel = document.getElementById('headerVoiceLabel');
const btnInputVoiceToggle = document.getElementById('btnInputVoiceToggle');
const btnOpenVoiceSettingsPromo = document.getElementById('btnOpenVoiceSettingsPromo');
const voiceSettingsModal = document.getElementById('voiceSettingsModal');
const closeVoiceSettingsBtn = document.getElementById('closeVoiceSettingsBtn');
const btnDoneVoiceSettings = document.getElementById('btnDoneVoiceSettings');
const voiceLangSelect = document.getElementById('voiceLangSelect');
const modalVoiceStatusPill = document.getElementById('modalVoiceStatusPill');
const btnModalToggleVoice = document.getElementById('btnModalToggleVoice');
const phrasesCardsContainer = document.getElementById('phrasesCardsContainer');
const btnResetPhrases = document.getElementById('btnResetPhrases');
const btnOpenAddPhraseModal = document.getElementById('btnOpenAddPhraseModal');

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

// Contact Live Location Viewer Modal Elements
const contactLiveViewerModal = document.getElementById('contactLiveViewerModal');
const viewerSessionIdTag = document.getElementById('viewerSessionIdTag');
const viewerStatusBanner = document.getElementById('viewerStatusBanner');
const viewerCoordinates = document.getElementById('viewerCoordinates');
const viewerAccuracy = document.getElementById('viewerAccuracy');
const viewerLastUpdated = document.getElementById('viewerLastUpdated');
const viewerSessionState = document.getElementById('viewerSessionState');
const closeViewerModalBtn = document.getElementById('closeViewerModalBtn');

// State variables
let currentReportCoords = { lat: 17.4435, lng: 78.3772 };
let activePhotoDataUrl = null;
let navigationSimulationInterval = null;
let viewerMapInstance = null;
let viewerMarker = null;
let viewerPolyline = null;

// Initialize Central Emergency SOS Service
const emergencySos = new EmergencySosService({
  onStateChange: (state, data) => {
    handleSosStateChange(state, data);
  },
  onCountdownTick: (secondsRemaining) => {
    centralCountdownNumber.textContent = secondsRemaining;
    centralCountdownNoticeSecs.textContent = secondsRemaining;
    sound.playCountdownChime(secondsRemaining);
  },
  onLocationUpdate: (loc, error) => {
    renderSosLocation(loc, error);
  },
  onContactsChange: (contacts) => {
    renderSosActiveContacts(contacts);
    renderContactsManagerList(contacts);
    updateContactsCountBadge();
  },
  onReadinessChange: (isReady, report) => {
    renderSosReadiness(isReady, report);
  }
});

// Initialize Voice Panic Engine (Connects directly to EmergencySosService)
const voicePanicEngine = new VoicePanicEngine({
  onStatusChange: (status, label) => {
    updateVoicePanicStatusUI(status, label);
  },
  onEmergencyDetected: (phrase) => {
    emergencySos.startSosCountdown(`Voice Trigger ("${phrase}")`);
  }
});

// ================= SOS READINESS RENDERING =================
function renderSosReadiness(isReady, report) {
  if (isReady) {
    headerSosReadinessPill.className = 'status-indicator-pill ready';
    headerSosReadinessLabel.textContent = 'SOS READY';

    sosReadinessBanner.className = 'sos-readiness-banner ready';
    readinessIconBox.className = 'readiness-icon-box ready';
    readinessBannerTitle.textContent = 'SOS READY';
    readinessBadgeTag.className = 'badge-tag-clean success';
    readinessBadgeTag.textContent = 'Pre-Authorized';
    readinessBannerSub.textContent = 'All emergency permissions pre-authorized. 1-Tap SOS will execute immediately with zero prompts.';
    btnBannerOpenSetup.textContent = 'Check Setup';

    setupStatusDot.className = 'status-indicator-dot ready';
    setupStatusHeadline.textContent = 'SOS READY';
    setupStatusSubtext.textContent = 'Emergency SOS is fully pre-authorized. In an emergency, alerts dispatch instantly.';
    setupStatusPill.className = 'status-indicator-pill ready';
    setupStatusPillText.textContent = 'Ready';
  } else {
    headerSosReadinessPill.className = 'status-indicator-pill not-ready';
    headerSosReadinessLabel.textContent = 'SOS Setup Required';

    sosReadinessBanner.className = 'sos-readiness-banner not-ready';
    readinessIconBox.className = 'readiness-icon-box not-ready';
    readinessBannerTitle.textContent = 'SOS NOT READY';
    readinessBadgeTag.className = 'badge-tag-clean warning';
    readinessBadgeTag.textContent = 'Setup Required';
    readinessBannerSub.textContent = 'Some emergency permissions or contacts are missing. Complete one-time setup now to ensure instant 1-tap SOS.';
    btnBannerOpenSetup.textContent = 'Complete Setup';

    setupStatusDot.className = 'status-indicator-dot not-ready';
    setupStatusHeadline.textContent = 'SOS NOT READY';
    setupStatusSubtext.textContent = 'Grant location access and configure contacts so emergency dispatch operates with zero prompts.';
    setupStatusPill.className = 'status-indicator-pill not-ready';
    setupStatusPillText.textContent = 'Setup Needed';
  }

  // Location item
  if (report.location === 'granted') {
    locStatusTag.className = 'check-status-tag success';
    locStatusTag.textContent = '✓ Granted';
    btnGrantLocation.classList.add('hidden');
  } else {
    locStatusTag.className = 'check-status-tag warning';
    locStatusTag.textContent = (report.location === 'denied') ? 'Denied' : 'Action Required';
    btnGrantLocation.classList.remove('hidden');
  }

  // Microphone item
  if (report.microphone === 'granted') {
    micStatusTag.className = 'check-status-tag success';
    micStatusTag.textContent = '✓ Granted';
    btnGrantMicrophone.classList.add('hidden');
  } else {
    micStatusTag.className = 'check-status-tag';
    micStatusTag.textContent = 'Optional / Needed for Voice';
    btnGrantMicrophone.classList.remove('hidden');
  }

  // Notification item
  if (report.notifications === 'granted') {
    notifStatusTag.className = 'check-status-tag success';
    notifStatusTag.textContent = '✓ Granted';
    btnGrantNotifications.classList.add('hidden');
  } else {
    notifStatusTag.className = 'check-status-tag';
    notifStatusTag.textContent = 'Optional';
    btnGrantNotifications.classList.remove('hidden');
  }

  // Contacts item
  if (report.contactsCount > 0 && report.primaryContact) {
    contactsStatusTag.className = 'check-status-tag success';
    contactsStatusTag.textContent = '✓ Configured';
    contactsCheckDesc.textContent = `${report.contactsCount} Contacts Configured (Primary: ${report.primaryContact.name}).`;
  } else {
    contactsStatusTag.className = 'check-status-tag warning';
    contactsStatusTag.textContent = 'Contact Required';
    contactsCheckDesc.textContent = 'At least 1 emergency contact with a primary contact must be saved.';
  }
}

// Open SOS Setup Modal
function openSosSetupModal() {
  emergencySos.checkPermissionStatus();
  sosSetupModal.classList.remove('hidden');
}

btnOpenSosSetup.addEventListener('click', openSosSetupModal);
btnBannerOpenSetup.addEventListener('click', openSosSetupModal);
closeSosSetupBtn.addEventListener('click', () => sosSetupModal.classList.add('hidden'));
btnDoneSosSetup.addEventListener('click', () => sosSetupModal.classList.add('hidden'));

btnGrantLocation.addEventListener('click', async () => {
  btnGrantLocation.disabled = true;
  btnGrantLocation.textContent = 'Requesting...';
  const res = await emergencySos.requestLocationPreAuthorization();
  btnGrantLocation.disabled = false;
  btnGrantLocation.textContent = 'Grant Access';
  if (!res.success) {
    alert(`Location access error: ${res.error}. Please check browser/device settings.`);
  }
});

btnGrantMicrophone.addEventListener('click', async () => {
  btnGrantMicrophone.disabled = true;
  btnGrantMicrophone.textContent = 'Requesting...';
  const res = await emergencySos.requestMicrophonePreAuthorization();
  btnGrantMicrophone.disabled = false;
  btnGrantMicrophone.textContent = 'Grant Access';
  if (!res.success) {
    alert(`Microphone access error: ${res.error}.`);
  }
});

btnGrantNotifications.addEventListener('click', async () => {
  await emergencySos.requestNotificationPreAuthorization();
});

btnSetupManageContacts.addEventListener('click', () => {
  sosSetupModal.classList.add('hidden');
  openContactsManager();
});

// ================= CENTRAL SOS STATE HANDLER =================
function handleSosStateChange(state, data = {}) {
  if (state === SOS_STATUS.COUNTDOWN) {
    countdownTriggerSourceName.textContent = (data.source || 'Emergency Trigger').toUpperCase();
    centralCountdownNumber.textContent = data.seconds || 5;
    centralCountdownNoticeSecs.textContent = data.seconds || 5;
    centralSosCountdownModal.classList.remove('hidden');
    sosModal.classList.add('hidden');
  } else if (state === SOS_STATUS.INACTIVE) {
    centralSosCountdownModal.classList.add('hidden');
    sosModal.classList.add('hidden');
    if (data.cancelled) {
      sound.playBeep(440, 0.15);
      alert("SOS cancelled. Returning to SafeRoute.");
      voicePanicEngine.resumeAfterEmergency();
    } else if (data.stopped) {
      voicePanicEngine.resumeAfterEmergency();
    }
  } else if (state === SOS_STATUS.ACTIVE) {
    centralSosCountdownModal.classList.add('hidden');
    sosTriggerSourceName.textContent = (data.source || 'EMERGENCY TRIGGER').toUpperCase();
    sosModal.classList.remove('hidden');
    sound.playSiren();
    
    if (data.liveUrl) {
      inputLiveUrlDisplay.value = data.liveUrl;
      btnTestOpenLiveUrl.href = data.liveUrl;
    }

    renderSosActiveContacts(emergencySos.getContacts());
  }
}

function renderSosLocation(loc, error) {
  if (loc) {
    sosGpsStatusBadge.className = 'status-indicator-pill listening';
    sosGpsStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-label">Live Active</span>';
    sosGpsCoords.textContent = `${loc.latitude}° N, ${loc.longitude}° E (±${loc.accuracy}m)`;
    sosGpsTimestamp.textContent = `Time: ${loc.timestamp}`;
    
    if (emergencySos.activeLiveSession) {
      const bCount = emergencySos.activeLiveSession.breadcrumbs.length || 1;
      sosGpsBreadcrumbsCount.textContent = `${bCount} fix${bCount > 1 ? 'es' : ''} recorded`;
      
      const liveUrl = liveSosSessionStore.getLiveTrackingUrl(emergencySos.activeLiveSession.id);
      inputLiveUrlDisplay.value = liveUrl;
      btnTestOpenLiveUrl.href = liveUrl;
    }

    safeRouteMapRenderer.updateUserLocation(loc.latitude, loc.longitude);
  } else {
    sosGpsStatusBadge.className = 'status-indicator-pill unsupported';
    sosGpsStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-label">Location Unavailable</span>';
    sosGpsCoords.textContent = error || 'Unable to access your current location.';
    sosGpsTimestamp.textContent = `Time: ${new Date().toLocaleTimeString()}`;
  }
}

// Copy Live Tracking Link
btnCopyLiveUrl.addEventListener('click', () => {
  if (inputLiveUrlDisplay.value) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inputLiveUrlDisplay.value);
      showSosStatusToast("Live tracking link copied to clipboard.");
    } else {
      prompt("Copy live tracking link:", inputLiveUrlDisplay.value);
    }
  }
});

// Render contacts list inside active SOS screen
function renderSosActiveContacts(contacts) {
  sosActiveContactsList.innerHTML = '';
  if (!contacts || contacts.length === 0) {
    sosActiveContactsList.innerHTML = '<div class="text-xs text-muted py-2">No emergency contacts configured yet.</div>';
    return;
  }

  contacts.forEach((c) => {
    const card = document.createElement('div');
    card.className = `sos-contact-item-card ${c.isPrimary ? 'primary' : ''}`;

    const callBadgeClass = c.callStatus.includes('Started') ? 'good' : c.callStatus.includes('Failed') ? 'danger' : 'dim';
    const msgBadgeClass = c.messageStatus.includes('Opened') || c.messageStatus.includes('Shared') ? 'good' : c.messageStatus.includes('Failed') ? 'danger' : 'dim';

    card.innerHTML = `
      <div class="sos-contact-info">
        <div class="contact-name-row">
          <strong>${c.name}</strong>
          ${c.isPrimary ? '<span class="primary-badge">PRIMARY</span>' : ''}
          <span class="relation-tag">${c.relation || 'Contact'}</span>
        </div>
        <div class="contact-phone-text">${c.phone}</div>
        <div class="contact-comm-statuses">
          <span>Call: <strong class="status-text ${callBadgeClass}">${c.callStatus}</strong></span>
          <span>·</span>
          <span>Message: <strong class="status-text ${msgBadgeClass}">${c.messageStatus}</strong></span>
        </div>
      </div>

      <div class="sos-contact-actions">
        <button type="button" class="btn-contact-call" title="Call this contact via device phone dialer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>Call</span>
        </button>
        <button type="button" class="btn-contact-msg" title="Send emergency SMS via messaging app">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>SMS</span>
        </button>
      </div>
    `;

    // Action listeners
    card.querySelector('.btn-contact-call').addEventListener('click', () => {
      const res = emergencySos.callContact(c.id);
      if (!res.success) alert(res.error);
    });

    card.querySelector('.btn-contact-msg').addEventListener('click', async () => {
      const res = await emergencySos.sendMessageToContact(c.id);
      if (res.success) {
        showSosStatusToast(res.status);
      } else {
        alert(res.error);
      }
    });

    sosActiveContactsList.appendChild(card);
  });
}

function showSosStatusToast(msg) {
  sosDispatchStatus.textContent = msg;
  sosDispatchStatus.classList.remove('hidden');
  setTimeout(() => {
    sosDispatchStatus.classList.add('hidden');
  }, 6000);
}

// Wire SOS Trigger Buttons
openSosBtn.addEventListener('click', () => {
  emergencySos.startSosCountdown('One-Tap SOS Button');
});

const triggerManualSos = document.getElementById('triggerManualSos');
if (triggerManualSos) {
  triggerManualSos.addEventListener('click', () => {
    emergencySos.startSosCountdown('Manual CCTV Emergency');
  });
}

btnCancelCentralCountdown.addEventListener('click', () => {
  emergencySos.cancelSosCountdown();
});

btnDismissSos.addEventListener('click', () => {
  emergencySos.stopSOS();
});

closeSosModalBtn.addEventListener('click', () => {
  emergencySos.stopSOS();
});

// Primary Contact Quick Call Button
btnCallPrimaryContactNow.addEventListener('click', () => {
  const primary = emergencySos.getPrimaryContact();
  if (primary) {
    const res = emergencySos.callContact(primary.id);
    if (!res.success) alert(res.error);
  } else {
    alert("No emergency contacts configured. Please add an emergency contact.");
  }
});

// Send Emergency Message to All Contacts Button
btnSendEmergencyMessageNow.addEventListener('click', async () => {
  const res = await emergencySos.shareEmergencyAlertWithAll();
  if (res.success) {
    showSosStatusToast(res.status);
  } else {
    alert(res.error);
  }
});

// ================= EMERGENCY CONTACTS MANAGER MODAL =================
function updateContactsCountBadge() {
  const count = emergencySos.getContacts().length;
  contactsCountBadge.textContent = count;
}
updateContactsCountBadge();

function openContactsManager() {
  renderContactsManagerList(emergencySos.getContacts());
  addContactInlineForm.classList.add('hidden');
  contactsManagerModal.classList.remove('hidden');
}

btnOpenContactsManager.addEventListener('click', openContactsManager);
btnEditContactsInSos.addEventListener('click', openContactsManager);
closeContactsManagerBtn.addEventListener('click', () => contactsManagerModal.classList.add('hidden'));
btnDoneContactsManager.addEventListener('click', () => contactsManagerModal.classList.add('hidden'));

function renderContactsManagerList(contacts) {
  contactsManagerList.innerHTML = '';
  if (!contacts || contacts.length === 0) {
    contactsManagerList.innerHTML = '<div class="text-xs text-muted py-3">No emergency contacts saved yet. Click "+ Add Emergency Contact" above.</div>';
    return;
  }

  contacts.forEach((c) => {
    const card = document.createElement('div');
    card.className = `contact-mgr-item-card ${c.isPrimary ? 'primary' : ''}`;

    card.innerHTML = `
      <div class="mgr-contact-main">
        <div class="contact-name-row">
          <strong>${c.name}</strong>
          ${c.isPrimary ? '<span class="primary-badge">PRIMARY</span>' : ''}
          <span class="relation-tag">${c.relation || 'Contact'}</span>
        </div>
        <div class="contact-phone-text">${c.phone}</div>
      </div>

      <div class="mgr-contact-tools">
        ${!c.isPrimary ? '<button type="button" class="btn-mgr-tool btn-set-primary">Set Primary</button>' : ''}
        <button type="button" class="btn-mgr-tool btn-edit-contact">Edit</button>
        <button type="button" class="btn-mgr-tool btn-del-contact">Delete</button>
      </div>
    `;

    if (!c.isPrimary) {
      card.querySelector('.btn-set-primary').addEventListener('click', () => {
        emergencySos.setPrimaryContact(c.id);
      });
    }

    card.querySelector('.btn-edit-contact').addEventListener('click', () => {
      editContactId.value = c.id;
      inputContactName.value = c.name;
      inputContactPhone.value = c.phone;
      inputContactRelation.value = c.relation || '';
      checkContactIsPrimary.checked = !!c.isPrimary;
      contactFormTitle.textContent = 'Edit Contact';
      contactFormError.classList.add('hidden');
      addContactInlineForm.classList.remove('hidden');
    });

    card.querySelector('.btn-del-contact').addEventListener('click', () => {
      if (confirm(`Remove emergency contact "${c.name}"?`)) {
        emergencySos.deleteContact(c.id);
      }
    });

    contactsManagerList.appendChild(card);
  });
}

btnOpenAddContactForm.addEventListener('click', () => {
  editContactId.value = '';
  inputContactName.value = '';
  inputContactPhone.value = '';
  inputContactRelation.value = '';
  checkContactIsPrimary.checked = (emergencySos.getContacts().length === 0);
  contactFormTitle.textContent = 'Add New Emergency Contact';
  contactFormError.classList.add('hidden');
  addContactInlineForm.classList.remove('hidden');
});

btnCancelContactForm.addEventListener('click', () => {
  addContactInlineForm.classList.add('hidden');
});

btnSaveContactSubmit.addEventListener('click', () => {
  const name = inputContactName.value.trim();
  const phone = inputContactPhone.value.trim();
  const relation = inputContactRelation.value.trim();
  const isPrimary = checkContactIsPrimary.checked;
  const id = editContactId.value;

  if (!name || !phone) {
    contactFormError.textContent = 'Contact name and phone number are required.';
    contactFormError.classList.remove('hidden');
    return;
  }

  if (id) {
    const res = emergencySos.updateContact(id, { name, phone, relation, isPrimary });
    if (!res.success) {
      contactFormError.textContent = res.error;
      contactFormError.classList.remove('hidden');
      return;
    }
  } else {
    const res = emergencySos.addContact(name, phone, relation, isPrimary);
    if (!res.success) {
      contactFormError.textContent = res.error;
      contactFormError.classList.remove('hidden');
      return;
    }
  }

  addContactInlineForm.classList.add('hidden');
});

// ================= MULTILINGUAL VOICE SOS UI =================
voiceLangSelect.value = voicePanicEngine.currentLanguage;
voiceLangSelect.addEventListener('change', () => {
  voicePanicEngine.setLanguage(voiceLangSelect.value);
});

function updateVoicePanicStatusUI(status) {
  if (status === 'LISTENING') {
    headerVoiceLabel.textContent = 'Voice SOS: Active';
    btnOpenVoiceSettings.classList.add('listening');
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
    btnModalToggleVoice.textContent = 'Unsupported';
    btnModalToggleVoice.disabled = true;

    if (btnInputVoiceToggle) {
      btnInputVoiceToggle.textContent = 'Browser Unsupported';
      btnInputVoiceToggle.disabled = true;
    }
  } else {
    headerVoiceLabel.textContent = 'Voice SOS';
    btnOpenVoiceSettings.classList.remove('listening');
    btnModalToggleVoice.textContent = 'Enable';
    btnModalToggleVoice.className = 'btn-primary-action-sm';

    if (btnInputVoiceToggle) {
      btnInputVoiceToggle.textContent = 'Enable Voice SOS';
      btnInputVoiceToggle.classList.remove('active');
    }
  }
}

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

btnModalToggleVoice.addEventListener('click', () => {
  if (!voicePanicEngine.isSupported) {
    alert("Hands-Free Voice SOS is not supported by your current browser. Please use Chrome or Edge for Web Speech API support.");
    return;
  }
  voicePanicEngine.toggle();
});

if (btnInputVoiceToggle) {
  btnInputVoiceToggle.addEventListener('click', () => {
    if (!voicePanicEngine.isSupported) {
      alert("Hands-Free Voice SOS is not supported by your current browser. Please use Chrome or Edge for Web Speech API support.");
      return;
    }
    voicePanicEngine.toggle();
  });
}

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
        <button type="button" class="btn-phrase-tool btn-edit-phrase">Edit</button>
        <button type="button" class="btn-phrase-tool btn-del-phrase">Delete</button>
      </div>
    `;

    card.querySelector('.phrase-toggle-input').addEventListener('change', () => {
      voicePanicEngine.togglePhrase(item.id);
      renderPhrasesList();
    });

    card.querySelector('.btn-edit-phrase').addEventListener('click', () => {
      editPhraseId.value = item.id;
      inputCustomPhrase.value = item.phrase;
      selectPhraseLangTag.value = item.lang || 'all';
      addPhraseModalTitle.textContent = 'Edit Emergency Trigger Phrase';
      addPhraseErrorMsg.classList.add('hidden');
      addPhraseModal.classList.remove('hidden');
    });

    card.querySelector('.btn-del-phrase').addEventListener('click', () => {
      voicePanicEngine.deletePhrase(item.id);
      renderPhrasesList();
    });

    phrasesCardsContainer.appendChild(card);
  });
}

btnResetPhrases.addEventListener('click', () => {
  if (confirm("Restore default multilingual emergency trigger phrases?")) {
    voicePanicEngine.resetToDefaults();
    renderPhrasesList();
  }
});

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
    const res = voicePanicEngine.updatePhrase(id, text);
    if (!res.success) {
      addPhraseErrorMsg.textContent = res.error;
      addPhraseErrorMsg.classList.remove('hidden');
      return;
    }
  } else {
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

// ================= CONTACT LIVE LOCATION VIEWER MODE (?sos_session=...) =================
function checkUrlSosSession() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sos_session');
  if (sessionId) {
    openContactLiveViewer(sessionId);
  }
}

function openContactLiveViewer(sessionId) {
  contactLiveViewerModal.classList.remove('hidden');
  viewerSessionIdTag.textContent = `Session: ${sessionId}`;

  const session = liveSosSessionStore.getSession(sessionId);
  renderViewerSessionData(session, sessionId);

  // Initialize Viewer Leaflet Map
  if (!viewerMapInstance) {
    const initialLat = session?.currentCoords?.latitude || 17.4435;
    const initialLng = session?.currentCoords?.longitude || 78.3772;
    
    viewerMapInstance = L.map('viewerLeafletMap', {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(viewerMapInstance);

    const pulseIcon = L.divIcon({
      className: 'live-viewer-marker',
      html: '<span class="live-viewer-pulse-core"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    viewerMarker = L.marker([initialLat, initialLng], { icon: pulseIcon }).addTo(viewerMapInstance);
    viewerPolyline = L.polyline([], { color: '#dc2626', weight: 4, opacity: 0.8 }).addTo(viewerMapInstance);
  }

  // Live session update listener
  liveSosSessionStore.onSessionUpdate((updatedSession) => {
    if (updatedSession.id === sessionId) {
      renderViewerSessionData(updatedSession, sessionId);
    }
  });

  setTimeout(() => {
    if (viewerMapInstance) viewerMapInstance.invalidateSize();
  }, 200);
}

function renderViewerSessionData(session, sessionId) {
  if (!session) {
    viewerCoordinates.textContent = 'Waiting for initial GPS fix...';
    viewerSessionState.textContent = 'CONNECTING...';
    viewerSessionState.className = 'text-warning';
    return;
  }

  if (session.status === 'TERMINATED') {
    viewerSessionState.textContent = 'SOS ENDED';
    viewerSessionState.className = 'text-danger';
    viewerStatusBanner.className = 'viewer-alert-banner ended';
    viewerStatusBanner.innerHTML = '<strong>🔴 SOS SESSION TERMINATED</strong><p>The emergency session has been ended by the user.</p>';
  } else {
    viewerSessionState.textContent = 'ACTIVE LIVE';
    viewerSessionState.className = 'text-success';
  }

  if (session.currentCoords) {
    const { latitude, longitude, accuracy, timestamp } = session.currentCoords;
    viewerCoordinates.textContent = `${latitude}° N, ${longitude}° E`;
    viewerAccuracy.textContent = `±${accuracy || 10} meters`;
    viewerLastUpdated.textContent = timestamp ? new Date(timestamp).toLocaleTimeString() : 'Just now';

    if (viewerMapInstance && viewerMarker) {
      viewerMarker.setLatLng([latitude, longitude]);
      viewerMapInstance.panTo([latitude, longitude]);

      if (session.breadcrumbs && session.breadcrumbs.length > 0) {
        const latLngs = session.breadcrumbs.map(b => [b.latitude, b.longitude]);
        viewerPolyline.setLatLngs(latLngs);
      }
    }
  }
}

closeViewerModalBtn.addEventListener('click', () => {
  contactLiveViewerModal.classList.add('hidden');
  // Clean URL parameter without reload
  const url = new URL(window.location);
  url.searchParams.delete('sos_session');
  window.history.pushState({}, '', url);
});

// Check URL parameter on initial load
checkUrlSosSession();

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

// Initial setup checks & drawer counts
renderCommunityReportsDrawer();
