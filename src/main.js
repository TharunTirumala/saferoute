import { authService } from './authService.js';
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
import { generateLLMSafetyReasoning } from './llmService.js';
import { generateRouteExplanation } from './explainabilityEngine.js';
import { safetyForecastEngine } from './safetyForecastEngine.js';
import { smartNewsReader } from './smartNewsReader.js';

// ================= TAB SWITCHING =================
const tabGuardianEye = document.getElementById('tabGuardianEye');
const tabSafeRoute = document.getElementById('tabSafeRoute');
const viewGuardianEye = document.getElementById('viewGuardianEye');
const viewSafeRoute = document.getElementById('viewSafeRoute');

function switchToSafeRoute() {
  if (tabSafeRoute) tabSafeRoute.classList.add('active');
  if (tabGuardianEye) tabGuardianEye.classList.remove('active');
  if (viewSafeRoute) viewSafeRoute.classList.add('active');
  if (viewGuardianEye) viewGuardianEye.classList.remove('active');
  setTimeout(() => {
    if (safeRouteMapRenderer && safeRouteMapRenderer.map) {
      safeRouteMapRenderer.map.invalidateSize();
    }
  }, 100);
}

function switchToGuardianEye() {
  if (tabGuardianEye) tabGuardianEye.classList.add('active');
  if (tabSafeRoute) tabSafeRoute.classList.remove('active');
  if (viewGuardianEye) viewGuardianEye.classList.add('active');
  if (viewSafeRoute) viewSafeRoute.classList.remove('active');
}

if (tabSafeRoute) tabSafeRoute.addEventListener('click', switchToSafeRoute);
if (tabGuardianEye) tabGuardianEye.addEventListener('click', switchToGuardianEye);

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

const primaryCallStatusBadge = document.getElementById('primaryCallStatusBadge');
const primaryCallStatusText = document.getElementById('primaryCallStatusText');
const primaryContactNameDisplay = document.getElementById('primaryContactNameDisplay');

const emergencyMsgStatusBadge = document.getElementById('emergencyMsgStatusBadge');
const emergencyMsgStatusText = document.getElementById('emergencyMsgStatusText');
const autoMsgContactsSummary = document.getElementById('autoMsgContactsSummary');

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

// Initialize Voice Panic Engine (Connects directly to EmergencySosService & n8n Automation)
const voicePanicEngine = new VoicePanicEngine({
  onStatusChange: (status, label) => {
    updateVoicePanicStatusUI(status, label);
  },
  onEmergencyDetected: (phrase) => {
    console.log(`🎙️ Voice Emergency Triggered: "${phrase}" -> Dispatching n8n & Twilio Calls`);
    emergencySos.executeSosNow(`Voice SOS Triggered ("${phrase}")`);
  }
});

// Auto-start Voice Listening in background if browser supports speech recognition
if (voicePanicEngine && voicePanicEngine.isSupported) {
  setTimeout(() => {
    try {
      voicePanicEngine.startListening();
    } catch (e) {
      console.info("Voice engine background start note:", e.message);
    }
  }, 1000);
}

// ================= SOS READINESS RENDERING =================
function renderSosReadiness(isReady, report) {
  if (isReady) {
    if (headerSosReadinessPill) headerSosReadinessPill.className = 'status-indicator-pill ready';
    if (headerSosReadinessLabel) headerSosReadinessLabel.textContent = 'SOS READY';

    if (sosReadinessBanner) sosReadinessBanner.className = 'sos-readiness-banner ready';
    if (readinessIconBox) readinessIconBox.className = 'readiness-icon-box ready';
    if (readinessBannerTitle) readinessBannerTitle.textContent = 'SOS READY';
    if (readinessBadgeTag) {
      readinessBadgeTag.className = 'badge-tag-clean success';
      readinessBadgeTag.textContent = 'Pre-Authorized';
    }
    if (readinessBannerSub) readinessBannerSub.textContent = 'All emergency permissions pre-authorized. 1-Tap SOS will execute immediately with zero prompts.';
    if (btnBannerOpenSetup) btnBannerOpenSetup.textContent = 'Check Setup';

    if (setupStatusDot) setupStatusDot.className = 'status-indicator-dot ready';
    if (setupStatusHeadline) setupStatusHeadline.textContent = 'SOS READY';
    if (setupStatusSubtext) setupStatusSubtext.textContent = 'Emergency SOS is fully pre-authorized. In an emergency, alerts dispatch instantly.';
    if (setupStatusPill) setupStatusPill.className = 'status-indicator-pill ready';
    if (setupStatusPillText) setupStatusPillText.textContent = 'Ready';
  } else {
    if (headerSosReadinessPill) headerSosReadinessPill.className = 'status-indicator-pill not-ready';
    if (headerSosReadinessLabel) headerSosReadinessLabel.textContent = 'SOS Setup Required';

    if (sosReadinessBanner) sosReadinessBanner.className = 'sos-readiness-banner not-ready';
    if (readinessIconBox) readinessIconBox.className = 'readiness-icon-box not-ready';
    if (readinessBannerTitle) readinessBannerTitle.textContent = 'SOS NOT READY';
    if (readinessBadgeTag) {
      readinessBadgeTag.className = 'badge-tag-clean warning';
      readinessBadgeTag.textContent = 'Setup Required';
    }
    if (readinessBannerSub) readinessBannerSub.textContent = 'Some emergency permissions or contacts are missing. Complete one-time setup now to ensure instant 1-tap SOS.';
    if (btnBannerOpenSetup) btnBannerOpenSetup.textContent = 'Complete Setup';

    if (setupStatusDot) setupStatusDot.className = 'status-indicator-dot not-ready';
    if (setupStatusHeadline) setupStatusHeadline.textContent = 'SOS NOT READY';
    if (setupStatusSubtext) setupStatusSubtext.textContent = 'Grant location access and configure contacts so emergency dispatch operates with zero prompts.';
    if (setupStatusPill) setupStatusPill.className = 'status-indicator-pill not-ready';
    if (setupStatusPillText) setupStatusPillText.textContent = 'Setup Needed';
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

if (btnOpenSosSetup) btnOpenSosSetup.addEventListener('click', openSosSetupModal);
if (btnBannerOpenSetup) btnBannerOpenSetup.addEventListener('click', openSosSetupModal);
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
    centralCountdownNumber.textContent = data.seconds || 3;
    centralCountdownNoticeSecs.textContent = data.seconds || 3;
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
    sosGpsCoords.innerHTML = `<a href="https://www.google.com/maps?q=${loc.latitude},${loc.longitude}" target="_blank" class="live-gmaps-link" style="color: #2563eb; text-decoration: underline; font-weight: 700;">View Live Location on Google Maps ↗</a>`;
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

// Render contacts list and automatic response status inside active SOS screen
function renderSosActiveContacts(contacts) {
  const isNative = platformEmergencyBridge.isNativeAndroid();
  const webLimitationNotice = document.getElementById('webLimitationNotice');

  if (webLimitationNotice) {
    if (isNative) {
      webLimitationNotice.classList.add('hidden');
    } else {
      webLimitationNotice.classList.remove('hidden');
    }
  }

  // Update Top Call Status Card
  const primary = emergencySos.getPrimaryContact();
  if (primary) {
    primaryContactNameDisplay.textContent = `${primary.name} (${primary.phone})`;
    const status = primary.callStatus || (isNative ? 'Preparing' : 'Web Standby');

    if (status === 'Calling' || status === 'Active' || status.includes('Progress')) {
      primaryCallStatusText.textContent = status.toUpperCase();
      primaryCallStatusBadge.className = 'status-indicator-pill listening';
      primaryCallStatusBadge.innerHTML = `<span class="status-dot"></span><span>${status.toUpperCase()}</span>`;
    } else if (status === 'Failed' || status.includes('Failed')) {
      primaryCallStatusText.textContent = 'FAILED';
      primaryCallStatusBadge.className = 'status-indicator-pill unsupported';
      primaryCallStatusBadge.innerHTML = '<span class="status-dot"></span><span>FAILED</span>';
    } else if (status === 'Web Standby' || !isNative) {
      primaryCallStatusText.textContent = 'WEB STANDBY';
      primaryCallStatusBadge.className = 'status-indicator-pill off';
      primaryCallStatusBadge.innerHTML = '<span class="status-dot"></span><span>WEB STANDBY</span>';
    } else {
      primaryCallStatusText.textContent = 'PREPARING';
      primaryCallStatusBadge.className = 'status-indicator-pill off';
      primaryCallStatusBadge.innerHTML = '<span class="status-dot"></span><span>PREPARING</span>';
    }
  }

  // Update Top Emergency Alert Status Card
  const anySent = contacts.some(c => c.messageStatus === 'Sent');
  const allFailed = contacts.length > 0 && contacts.every(c => c.messageStatus === 'Failed');

  if (anySent) {
    emergencyMsgStatusText.textContent = 'SENT';
    emergencyMsgStatusBadge.className = 'status-indicator-pill listening';
    emergencyMsgStatusBadge.innerHTML = '<span class="status-dot"></span><span>SENT</span>';
    autoMsgContactsSummary.textContent = `${contacts.length} contacts notified with Live GPS`;
  } else if (allFailed) {
    emergencyMsgStatusText.textContent = 'FAILED';
    emergencyMsgStatusBadge.className = 'status-indicator-pill unsupported';
    emergencyMsgStatusBadge.innerHTML = '<span class="status-dot"></span><span>FAILED</span>';
    autoMsgContactsSummary.textContent = 'Alert delivery failed';
  } else {
    emergencyMsgStatusText.textContent = 'SENDING...';
    emergencyMsgStatusBadge.className = 'status-indicator-pill off';
    emergencyMsgStatusBadge.innerHTML = '<span class="status-dot"></span><span>SENDING...</span>';
    autoMsgContactsSummary.textContent = `Dispatching live alert to ${contacts.length} contacts...`;
  }

  // Render individual contact cards (Read-only status overview)
  sosActiveContactsList.innerHTML = '';
  if (!contacts || contacts.length === 0) {
    sosActiveContactsList.innerHTML = '<div class="text-xs text-muted py-2">No emergency contacts configured yet.</div>';
    return;
  }

  contacts.forEach((c) => {
    const card = document.createElement('div');
    card.className = `sos-contact-item-card ${c.isPrimary ? 'primary' : ''}`;

    const isCallActive = c.callStatus.includes('Progress') || c.callStatus.includes('Started');
    const isCallFailed = c.callStatus.includes('Failed');
    const callText = isCallActive ? 'In Progress' : (isCallFailed ? 'Failed' : (c.isPrimary ? 'Preparing' : 'Standby'));
    const callBadgeClass = isCallActive ? 'good' : (isCallFailed ? 'danger' : 'dim');

    const isMsgSent = c.messageStatus === 'Sent';
    const isMsgFailed = c.messageStatus === 'Failed';
    const msgText = isMsgSent ? 'Sent' : (isMsgFailed ? 'Failed' : 'Sending...');
    const msgBadgeClass = isMsgSent ? 'good' : (isMsgFailed ? 'danger' : 'dim');

    card.innerHTML = `
      <div class="sos-contact-info">
        <div class="contact-name-row">
          <strong>${c.name}</strong>
          ${c.isPrimary ? '<span class="primary-badge">PRIMARY</span>' : ''}
          <span class="relation-tag">${c.relation || 'Contact'}</span>
        </div>
        <div class="contact-phone-text">${c.phone}</div>
        <div class="contact-comm-statuses">
          <span>Call: <strong class="status-text ${callBadgeClass}">${callText}</strong></span>
          <span>·</span>
          <span>Emergency Alert: <strong class="status-text ${msgBadgeClass}">${msgText}</strong></span>
        </div>
      </div>
    `;

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

// Wire SOS Trigger Buttons (Universal Failproof Dispatcher)
const triggerSosImmediately = (sourceName) => {
  console.log(`🚨 ${sourceName} Triggered -> Dispatching n8n & Twilio Calls Immediately`);
  emergencySos.executeSosNow(sourceName);
  cloudAlertDispatcher.dispatchEmergencyAlert({
    sessionId: 'instant_' + Date.now(),
    location: emergencySos.currentLocation,
    contacts: emergencySos.contacts,
    timestamp: new Date().toLocaleTimeString(),
    liveTrackingUrl: 'https://saferoute-tawny.vercel.app/',
    userPhone: '+916300863028'
  });
};

// Universal event listener: catches clicks on ANY button/element related to SOS
document.addEventListener('click', (e) => {
  const target = e.target.closest('#btnHeaderGlobalSos, #openSosBtn, #btnSidebarSos, #triggerManualSos, .btn-emergency-sos-sm, .sos-menu-btn');
  if (target) {
    e.preventDefault();
    triggerSosImmediately(target.id || target.textContent.trim() || 'Global SOS Click');
  }
});

const btnHeaderGlobalSos = document.getElementById('btnHeaderGlobalSos');
if (btnHeaderGlobalSos) {
  btnHeaderGlobalSos.addEventListener('click', () => triggerSosImmediately('Header Global ONE-TAP SOS'));
}

if (openSosBtn) {
  openSosBtn.addEventListener('click', () => triggerSosImmediately('One-Tap SOS Button'));
}

const btnSidebarSos = document.getElementById('btnSidebarSos');
if (btnSidebarSos) {
  btnSidebarSos.addEventListener('click', () => triggerSosImmediately('Menu SOS Button'));
}

const triggerManualSos = document.getElementById('triggerManualSos');
if (triggerManualSos) {
  triggerManualSos.addEventListener('click', () => triggerSosImmediately('Manual CCTV Emergency'));
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

btnDismissSos.addEventListener('click', () => {
  emergencySos.stopSOS();
});

closeSosModalBtn.addEventListener('click', () => {
  emergencySos.stopSOS();
});

// ================= EMERGENCY CONTACTS MANAGER MODAL =================
function updateContactsCountBadge() {
  const count = emergencySos.getContacts().length;
  if (contactsCountBadge) contactsCountBadge.textContent = count;
}
updateContactsCountBadge();

function openContactsManager() {
  renderContactsManagerList(emergencySos.getContacts());
  addContactInlineForm.classList.add('hidden');
  contactsManagerModal.classList.remove('hidden');
}

if (btnOpenContactsManager) btnOpenContactsManager.addEventListener('click', openContactsManager);
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
    if (headerVoiceLabel) headerVoiceLabel.textContent = 'Voice SOS: Active';
    if (btnOpenVoiceSettings) btnOpenVoiceSettings.classList.add('listening');
    if (btnOpenVoiceSettingsPromo) btnOpenVoiceSettingsPromo.classList.add('listening');
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
    if (headerVoiceLabel) headerVoiceLabel.textContent = 'Voice SOS: N/A';
    if (btnOpenVoiceSettings) btnOpenVoiceSettings.classList.remove('listening');
    if (btnOpenVoiceSettingsPromo) btnOpenVoiceSettingsPromo.classList.remove('listening');
    btnModalToggleVoice.textContent = 'Unsupported';
    btnModalToggleVoice.disabled = true;

    if (btnInputVoiceToggle) {
      btnInputVoiceToggle.textContent = 'Browser Unsupported';
      btnInputVoiceToggle.disabled = true;
    }
  } else {
    if (headerVoiceLabel) headerVoiceLabel.textContent = 'Voice SOS';
    if (btnOpenVoiceSettings) btnOpenVoiceSettings.classList.remove('listening');
    if (btnOpenVoiceSettingsPromo) btnOpenVoiceSettingsPromo.classList.remove('listening');
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

btnOpenVoiceSettings && btnOpenVoiceSettings.addEventListener('click', openVoiceSettingsModal);
if (btnOpenVoiceSettingsPromo) {
  btnOpenVoiceSettingsPromo && btnOpenVoiceSettingsPromo.addEventListener('click', openVoiceSettingsModal);
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

// ================= TRAVEL MODES DICTIONARY & FORMATTING =================
const TRAVEL_MODES = {
  walking: { name: 'Walking', icon: '🚶', speed: 4.8 },
  bus: { name: 'Bus', icon: '🚌', speed: 20.0 },
  car: { name: 'Car', icon: '🚗', speed: 32.0 },
  bike: { name: 'Bike', icon: '🏍️', speed: 26.0 },
  auto: { name: 'Auto', icon: '🛺', speed: 24.0 }
};

function formatDurationText(durationMin) {
  const rounded = Math.round(durationMin);
  if (rounded < 60) {
    return `${rounded} min`;
  }
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins > 0 ? `${hrs} hr ${mins < 10 ? '0' : ''}${mins} min` : `${hrs} hr`;
}

// Function to calculate and update live route distance and time preview on First Interface
function updateFirstPageRoutePreview() {
  const origin = safeRouteEngine.origin;
  const dest = safeRouteEngine.destination;
  const modeKey = safeRouteEngine.travelMode || 'car';
  const modeInfo = TRAVEL_MODES[modeKey] || TRAVEL_MODES.car;

  const previewTravelingByTag = document.getElementById('previewTravelingByTag');
  const previewDistanceValue = document.getElementById('previewDistanceValue');
  const previewTimeValue = document.getElementById('previewTimeValue');

  if (previewTravelingByTag) {
    previewTravelingByTag.textContent = `Traveling by ${modeInfo.icon} ${modeInfo.name}`;
  }

  if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
    // Mode-specific route distance calculation based on urban road curvature
    const R = 6371;
    const dLat = ((dest.lat - origin.lat) * Math.PI) / 180;
    const dLon = ((dest.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((dest.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const rawDist = R * c;
    const curvatureFactor = modeKey === 'walking' ? 1.18 : modeKey === 'bus' ? 1.32 : 1.25;
    const distKm = Math.max(0.5, Math.round(rawDist * curvatureFactor * 10) / 10);
    const durMin = (distKm / modeInfo.speed) * 60;

    if (previewDistanceValue) previewDistanceValue.textContent = `${distKm} km`;
    if (previewTimeValue) previewTimeValue.textContent = formatDurationText(durMin);
  }
}

// ================= TRAVEL MODE DROPDOWN =================
const btnTravelModeDropdownTrigger = document.getElementById('btnTravelModeDropdownTrigger');
const travelModePopover = document.getElementById('travelModePopover');
const selectedModeIcon = document.getElementById('selectedModeIcon');
const selectedModeDisplay = document.getElementById('selectedModeDisplay');
const modeOptionButtons = document.querySelectorAll('.mode-option-btn');

function toggleModePopover(show) {
  if (!travelModePopover) return;
  const isHidden = travelModePopover.classList.contains('hidden');
  const shouldShow = show !== undefined ? show : isHidden;
  
  if (shouldShow) {
    travelModePopover.classList.remove('hidden');
    btnTravelModeDropdownTrigger && btnTravelModeDropdownTrigger.setAttribute('aria-expanded', 'true');
  } else {
    travelModePopover.classList.add('hidden');
    btnTravelModeDropdownTrigger && btnTravelModeDropdownTrigger.setAttribute('aria-expanded', 'false');
  }
}

if (btnTravelModeDropdownTrigger) {
  btnTravelModeDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModePopover();
  });
}

if (travelModePopover) {
  travelModePopover.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Close popovers on click outside
document.addEventListener('click', (e) => {
  if (travelModePopover && !travelModePopover.contains(e.target) && btnTravelModeDropdownTrigger && !btnTravelModeDropdownTrigger.contains(e.target)) {
    toggleModePopover(false);
  }
});

modeOptionButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const selectedMode = btn.dataset.mode || 'car';
    safeRouteEngine.travelMode = selectedMode;
    const modeInfo = TRAVEL_MODES[selectedMode] || TRAVEL_MODES.car;

    modeOptionButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (selectedModeIcon) selectedModeIcon.textContent = modeInfo.icon;
    if (selectedModeDisplay) selectedModeDisplay.textContent = `How are you travelling? → ${modeInfo.icon} ${modeInfo.name}`;

    toggleModePopover(false);
    updateFirstPageRoutePreview();
  });
});

// ================= TRAVEL TIME SELECTION =================
// ================= TIME OF TRAVEL DROPDOWN / POPOVER =================
let selectedHour = null;
let selectedPeriod = 'AM';
let selectedTimeMode = 'live';

const btnTimeDropdownTrigger = document.getElementById('btnTimeDropdownTrigger');
const timePickerPopover = document.getElementById('timePickerPopover');
const selectedTimeDisplay = document.getElementById('selectedTimeDisplay');
const btnTimeNowLive = document.getElementById('btnTimeNowLive');
const timePeriodSelect = document.getElementById('timePeriodSelect');
const hourButtons = document.querySelectorAll('.hour-btn');

function toggleTimePopover(show) {
  if (!timePickerPopover) return;
  const isHidden = timePickerPopover.classList.contains('hidden');
  const shouldShow = show !== undefined ? show : isHidden;
  
  if (shouldShow) {
    timePickerPopover.classList.remove('hidden');
    btnTimeDropdownTrigger && btnTimeDropdownTrigger.setAttribute('aria-expanded', 'true');
  } else {
    timePickerPopover.classList.add('hidden');
    btnTimeDropdownTrigger && btnTimeDropdownTrigger.setAttribute('aria-expanded', 'false');
  }
}

function updateFinalTime() {
  if (selectedTimeMode === 'live') {
    safeRouteEngine.travelTime = 'Now — Live';
    if (selectedTimeDisplay) selectedTimeDisplay.textContent = 'Now — Live';
    if (btnTimeNowLive) btnTimeNowLive.classList.add('active');
    hourButtons.forEach(b => b.classList.remove('active'));
    toggleTimePopover(false);
  } else if (selectedHour) {
    const finalTimeStr = `${selectedHour}:00 ${selectedPeriod}`;
    safeRouteEngine.travelTime = finalTimeStr;
    if (selectedTimeDisplay) selectedTimeDisplay.textContent = finalTimeStr;
    if (btnTimeNowLive) btnTimeNowLive.classList.remove('active');
    toggleTimePopover(false);
  }
}

if (btnTimeDropdownTrigger) {
  btnTimeDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTimePopover();
  });
}

if (timePickerPopover) {
  timePickerPopover.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Close popover when clicking outside
document.addEventListener('click', (e) => {
  if (timePickerPopover && !timePickerPopover.contains(e.target) && btnTimeDropdownTrigger && !btnTimeDropdownTrigger.contains(e.target)) {
    toggleTimePopover(false);
  }
});

// "Now — Live" Click
if (btnTimeNowLive) {
  btnTimeNowLive.addEventListener('click', () => {
    selectedTimeMode = 'live';
    selectedHour = null;
    updateFinalTime();
  });
}

// Hour Button Click
hourButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedTimeMode = 'specific';
    selectedHour = btn.getAttribute('data-hour');
    hourButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateFinalTime();
  });
});

// Period (AM/PM) Change
if (timePeriodSelect) {
  timePeriodSelect.addEventListener('change', () => {
    selectedPeriod = timePeriodSelect.value || 'AM';
    if (selectedHour) {
      selectedTimeMode = 'specific';
      updateFinalTime();
    }
  });
}

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
let isCalculatingRoute = false;

tripInputForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleFindSafeRoutes();
});

btnFindSafestRoute.addEventListener('click', async (e) => {
  e.preventDefault();
  await handleFindSafeRoutes();
});

async function handleFindSafeRoutes() {
  if (isCalculatingRoute) return;
  isCalculatingRoute = true;
  findBtnText.textContent = 'Calculating Safe Routes...';
  btnFindSafestRoute.disabled = true;

  try {
    if (sourceInput.value && (!safeRouteEngine.origin || safeRouteEngine.origin.name !== sourceInput.value)) {
      try {
        const s = await safeRouteEngine.geocode(sourceInput.value);
        if (s[0]) safeRouteEngine.origin = { name: s[0].name, lat: s[0].lat, lng: s[0].lng };
      } catch (e) {
        if (!safeRouteEngine.origin) safeRouteEngine.origin = { name: sourceInput.value, lat: 17.4435, lng: 78.3772 };
      }
    }
    if (destInput.value && (!safeRouteEngine.destination || safeRouteEngine.destination.name !== destInput.value)) {
      try {
        const d = await safeRouteEngine.geocode(destInput.value);
        if (d[0]) safeRouteEngine.destination = { name: d[0].name, lat: d[0].lat, lng: d[0].lng };
      } catch (e) {
        if (!safeRouteEngine.destination) safeRouteEngine.destination = { name: destInput.value, lat: 17.4150, lng: 78.4350 };
      }
    }

    await safeRouteEngine.calculateRoutes();

    document.body.classList.remove('page-first');
    document.body.classList.add('page-second');
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
    summaryTimeChip.textContent = safeRouteEngine.travelTime || 'Now';

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
    isCalculatingRoute = false;
  }
}

// ================= BACK TO INTERFACE 1 =================
btnBackToInput.addEventListener('click', () => {
  document.body.classList.remove('page-second');
  document.body.classList.add('page-first');
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
    const exp = generateRouteExplanation(selected, routes);

    const whyCardTitleEl = document.getElementById('whyCardTitle');
    const whyScoreBadgeEl = document.getElementById('whyScoreBadge');
    const whyRoutePointsList = document.getElementById('whyRoutePointsList');

    if (whyCardTitleEl) whyCardTitleEl.textContent = exp.cardTitle;
    if (whyScoreBadgeEl) {
      whyScoreBadgeEl.textContent = `${exp.safetyScore}/100 ${exp.scoreLabel}`;
      whyScoreBadgeEl.className = `score-pill-clean ${exp.badgeClass}`;
    }

    if (whyRoutePointsList) {
      whyRoutePointsList.innerHTML = '';
      exp.points.forEach(pointText => {
        const li = document.createElement('li');
        li.className = 'why-point-item';
        
        const isWarn = pointText.includes('lower than Safest Route') || pointText.includes('higher exposure');
        
        li.innerHTML = `
          <span class="why-point-check ${isWarn ? 'warn' : ''}">${isWarn ? '⚠' : '✓'}</span>
          <p class="why-point-text">${pointText}</p>
        `;
        whyRoutePointsList.appendChild(li);
      });
    }

    // FEATURE 1: UPDATE SAFETY FORECAST PREDICTIVE RISK CARD
    const currentRiskValue = parseFloat((1 - (selected.safetyScore / 100)).toFixed(2));
    const forecast = safetyForecastEngine.predictRiskForecast({
      currentRiskScore: currentRiskValue,
      zoneName: selected.name || 'Selected Corridor'
    }, selectedForecastHours);

    const forecastNowScore = document.getElementById('forecastNowScore');
    const forecastFutureScore = document.getElementById('forecastFutureScore');
    const forecastDeltaTag = document.getElementById('forecastDeltaTag');
    const forecastTrendBadge = document.getElementById('forecastTrendBadge');
    const forecastDriversList = document.getElementById('forecastDriversList');

    if (forecastNowScore) forecastNowScore.textContent = forecast.currentRiskScore;
    if (forecastFutureScore) forecastFutureScore.textContent = `${forecast.predictedRiskScore} ${forecast.trendIcon}`;
    if (forecastDeltaTag) {
      forecastDeltaTag.textContent = `${forecast.percentChange} ${forecast.trendStatus}`;
      forecastDeltaTag.style.color = forecast.trendColor;
    }
    if (forecastTrendBadge) {
      forecastTrendBadge.textContent = `+${selectedForecastHours}h Forecast`;
      forecastTrendBadge.style.color = forecast.trendColor;
    }
    if (forecastDriversList) {
      forecastDriversList.innerHTML = forecast.forecastDrivers.map(d => `<li>${d}</li>`).join('');
    }
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

if (btnHeaderReportModal) btnHeaderReportModal.addEventListener('click', openReportModal);
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
openReportsDrawerBtn && openReportsDrawerBtn.addEventListener('click', () => {
  renderCommunityReportsDrawer();
  reportsDrawer.classList.remove('hidden');
});

closeDrawerBtn.addEventListener('click', () => {
  reportsDrawer.classList.add('hidden');
});

function renderCommunityReportsDrawer() {
  const reps = reportStore.getAllReports();
  if (reportsCountBadge) reportsCountBadge.textContent = reps.length;
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
document.body.classList.add('page-first');
document.body.classList.remove('page-second');
renderCommunityReportsDrawer();

// ================= FEATURE 1: SAFETY FORECAST CONTROLS =================
let selectedForecastHours = 3;
document.querySelectorAll('.forecast-hour-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.forecast-hour-btn').forEach((b) => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    selectedForecastHours = parseInt(e.currentTarget.getAttribute('data-hours'), 10) || 3;
    renderRouteResultsUI();
  });
});

// ================= FEATURE 2: SMART NEWS READER NLP SANDBOX =================
const smartNewsModal = document.getElementById('smartNewsModal');
const btnOpenSmartNewsModal = document.getElementById('btnOpenSmartNewsModal');
const closeSmartNewsBtn = document.getElementById('closeSmartNewsBtn');
const selectSampleHeadline = document.getElementById('selectSampleHeadline');
const inputNewsHeadline = document.getElementById('inputNewsHeadline');
const formSmartNewsNLP = document.getElementById('formSmartNewsNLP');

if (btnOpenSmartNewsModal && smartNewsModal) {
  btnOpenSmartNewsModal.addEventListener('click', () => {
    smartNewsModal.classList.remove('hidden');
    // Process initial sample headline if input has text
    if (selectSampleHeadline && selectSampleHeadline.options.length > 1) {
      selectSampleHeadline.selectedIndex = 1;
      const val = selectSampleHeadline.value;
      if (inputNewsHeadline) inputNewsHeadline.value = val;
      processHeadlineNLP(val);
    }
  });
}

if (closeSmartNewsBtn && smartNewsModal) {
  closeSmartNewsBtn.addEventListener('click', () => {
    smartNewsModal.classList.add('hidden');
  });
}

function processHeadlineNLP(headlineText) {
  if (!headlineText || !headlineText.trim()) return;

  const result = smartNewsReader.analyzeHeadline(headlineText.trim());
  if (!result) return;

  const nlpLocationVal = document.getElementById('nlpLocationVal');
  const nlpCrimeVal = document.getElementById('nlpCrimeVal');
  const nlpTimeVal = document.getElementById('nlpTimeVal');
  const nlpUrgencyVal = document.getElementById('nlpUrgencyVal');
  const nlpScoreResult = document.getElementById('nlpScoreResult');
  const nlpImpactBadge = document.getElementById('nlpImpactBadge');

  if (nlpLocationVal) nlpLocationVal.textContent = result.locationsFound.join(', ');
  if (nlpCrimeVal) nlpCrimeVal.textContent = `${result.crimesFound.join(', ')} (${result.maxCrimeSeverity})`;
  if (nlpTimeVal) nlpTimeVal.textContent = `${result.detectedTimeContext} (${result.timeFactor}x)`;
  if (nlpUrgencyVal) nlpUrgencyVal.textContent = `${result.urgencyFactor}x (${result.urgencyFactor > 1.2 ? 'High Concern' : 'Normal'})`;
  if (nlpScoreResult) nlpScoreResult.textContent = `${result.initialNewsRisk} ➔ ${result.newLocationRisk} (${result.riskDelta})`;

  if (nlpImpactBadge) {
    nlpImpactBadge.textContent = result.impactTag;
    nlpImpactBadge.className = `badge-tag-clean ${result.isPositiveAction ? 'success' : 'danger'}`;
  }
}

if (selectSampleHeadline) {
  selectSampleHeadline.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      if (inputNewsHeadline) inputNewsHeadline.value = val;
      processHeadlineNLP(val);
    }
  });
}

if (formSmartNewsNLP) {
  formSmartNewsNLP.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputNewsHeadline ? inputNewsHeadline.value : '';
    processHeadlineNLP(text);
  });
}

// Initialize First Page Route Preview on load
setTimeout(() => {
  updateFirstPageRoutePreview();
}, 200);

// ================= USER AUTHENTICATION & LOGIN WORKFLOW =================
const viewAuthLogin = document.getElementById('viewAuthLogin');
// viewSafeRoute already declaredconst headerUserStatus = document.getElementById('headerUserStatus');
const headerUserPhoneText = document.getElementById('headerUserPhoneText');
const btnHeaderLogout = document.getElementById('btnHeaderLogout');

const authStepMobile = document.getElementById('authStepMobile');
const authStepOtp = document.getElementById('authStepOtp');
const formSendOtp = document.getElementById('formSendOtp');
const formVerifyOtp = document.getElementById('formVerifyOtp');
const inputAuthMobile = document.getElementById('inputAuthMobile');
const btnSendOtp = document.getElementById('btnSendOtp');
const sendOtpBtnText = document.getElementById('sendOtpBtnText');
const btnVerifyOtp = document.getElementById('btnVerifyOtp');
const verifyOtpBtnText = document.getElementById('verifyOtpBtnText');
const displayAuthTargetMobile = document.getElementById('displayAuthTargetMobile');
const btnChangeMobileNumber = document.getElementById('btnChangeMobileNumber');
const btnResendOtp = document.getElementById('btnResendOtp');
const authMobileError = document.getElementById('authMobileError');
const authOtpError = document.getElementById('authOtpError');
const authDevOtpToast = document.getElementById('authDevOtpToast');
const authDevOtpCode = document.getElementById('authDevOtpCode');
const otpDigitInputs = document.querySelectorAll('.otp-digit-input');

let currentAuthMobileNumber = '';

function updateAuthUIState() {
  const isAuth = authService.isAuthenticated();
  if (isAuth) {
    viewAuthLogin && viewAuthLogin.classList.add('hidden');
    viewSafeRoute && viewSafeRoute.classList.remove('hidden');
    if (headerUserStatus) headerUserStatus.classList.remove('hidden');
    if (headerUserPhoneText) headerUserPhoneText.textContent = authService.getFormattedPhone();
    emergencySos.reloadUserContacts();
  } else {
    viewAuthLogin && viewAuthLogin.classList.remove('hidden');
    viewSafeRoute && viewSafeRoute.classList.add('hidden');
    if (headerUserStatus) headerUserStatus.classList.add('hidden');
    showAuthStepMobile();
  }
}

function showAuthStepMobile() {
  if (authStepMobile) authStepMobile.classList.remove('hidden');
  if (authStepOtp) authStepOtp.classList.add('hidden');
  if (authMobileError) authMobileError.classList.add('hidden');
  if (authOtpError) authOtpError.classList.add('hidden');
  if (authDevOtpToast) authDevOtpToast.classList.add('hidden');
  if (inputAuthMobile) {
    inputAuthMobile.value = '';
    setTimeout(() => inputAuthMobile.focus(), 150);
  }
}

function showAuthStepOtp(phone, devOtp) {
  if (authStepMobile) authStepMobile.classList.add('hidden');
  if (authStepOtp) authStepOtp.classList.remove('hidden');
  if (authOtpError) authOtpError.classList.add('hidden');
  if (displayAuthTargetMobile) displayAuthTargetMobile.textContent = phone;
  
  if (devOtp && authDevOtpToast && authDevOtpCode) {
    authDevOtpCode.textContent = devOtp;
    authDevOtpToast.classList.remove('hidden');
  } else if (authDevOtpToast) {
    authDevOtpToast.classList.add('hidden');
  }

  otpDigitInputs.forEach(i => i.value = '');
  if (otpDigitInputs[0]) setTimeout(() => otpDigitInputs[0].focus(), 150);
}

// 1. Mobile Number Submit Handler (OTP required ONLY ONCE per number)
formSendOtp && formSendOtp.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phoneVal = (inputAuthMobile?.value || '').trim();
  if (authMobileError) authMobileError.classList.add('hidden');

  if (sendOtpBtnText) sendOtpBtnText.textContent = 'Checking...';
  if (btnSendOtp) btnSendOtp.disabled = true;

  // Check if number is already verified previously
  const checkRes = await authService.checkOrLoginUser(phoneVal);

  if (!checkRes.success) {
    if (sendOtpBtnText) sendOtpBtnText.textContent = 'Continue';
    if (btnSendOtp) btnSendOtp.disabled = false;
    if (authMobileError) {
      authMobileError.textContent = checkRes.error || 'Invalid mobile number.';
      authMobileError.classList.remove('hidden');
    }
    return;
  }

  // RETURNING VERIFIED USER -> DO NOT SEND OTP, DO NOT ASK FOR OTP
  if (checkRes.isReturningUser) {
    if (sendOtpBtnText) sendOtpBtnText.textContent = 'Continue';
    if (btnSendOtp) btnSendOtp.disabled = false;
    updateAuthUIState();
    return;
  }

  // NEW USER -> Send OTP for first-time verification
  if (sendOtpBtnText) sendOtpBtnText.textContent = 'Sending OTP...';
  const res = await authService.sendOtp(phoneVal);

  if (sendOtpBtnText) sendOtpBtnText.textContent = 'Continue';
  if (btnSendOtp) btnSendOtp.disabled = false;

  if (res.success) {
    currentAuthMobileNumber = res.phone;
    showAuthStepOtp(res.phone, res.devOtp);
  } else {
    if (authMobileError) {
      authMobileError.textContent = res.error || 'Failed to send OTP.';
      authMobileError.classList.remove('hidden');
    }
  }
});

// 2. Change Mobile Number Button
btnChangeMobileNumber && btnChangeMobileNumber.addEventListener('click', () => {
  showAuthStepMobile();
});

// 3. Resend OTP Button
btnResendOtp && btnResendOtp.addEventListener('click', async () => {
  if (!currentAuthMobileNumber) return;
  btnResendOtp.textContent = 'Resending...';
  btnResendOtp.disabled = true;
  const res = await authService.sendOtp(currentAuthMobileNumber);
  btnResendOtp.textContent = 'Resend OTP';
  btnResendOtp.disabled = false;

  if (res.success && res.devOtp && authDevOtpCode) {
    authDevOtpCode.textContent = res.devOtp;
    authDevOtpToast && authDevOtpToast.classList.remove('hidden');
  }
});

// 4. OTP Inputs Auto-Advancement & Paste Support
otpDigitInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length === 1 && index < otpDigitInputs.length - 1) {
      otpDigitInputs[index + 1].focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      otpDigitInputs[index - 1].focus();
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
    digits.split('').forEach((d, i) => {
      if (otpDigitInputs[i]) otpDigitInputs[i].value = d;
    });
    const lastIdx = Math.min(digits.length, otpDigitInputs.length - 1);
    if (otpDigitInputs[lastIdx]) otpDigitInputs[lastIdx].focus();
  });
});

// 5. Verify OTP Handler
formVerifyOtp && formVerifyOtp.addEventListener('submit', async (e) => {
  e.preventDefault();
  const enteredOtp = Array.from(otpDigitInputs).map(i => i.value).join('');
  if (authOtpError) authOtpError.classList.add('hidden');

  if (verifyOtpBtnText) verifyOtpBtnText.textContent = 'Verifying...';
  if (btnVerifyOtp) btnVerifyOtp.disabled = true;

  const res = await authService.verifyOtp(currentAuthMobileNumber, enteredOtp);

  if (verifyOtpBtnText) verifyOtpBtnText.textContent = 'Verify & Continue';
  if (btnVerifyOtp) btnVerifyOtp.disabled = false;

  if (res.success) {
    updateAuthUIState();
  } else {
    if (authOtpError) {
      authOtpError.textContent = res.error || 'Incorrect OTP code.';
      authOtpError.classList.remove('hidden');
    }
  }
});

// 6. Header Logout Button
btnHeaderLogout && btnHeaderLogout.addEventListener('click', () => {
  if (confirm('Are you sure you want to log out of SafeRoute?')) {
    authService.logout();
    updateAuthUIState();
  }
});

// Initialize Authentication State on Load
updateAuthUIState();
