const en: Record<string, string> = {
  // ---------------------------------------------------------------------------
  // App
  // ---------------------------------------------------------------------------
  'app.waterTracker': 'Water Tracker',

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  'nav.map': 'Map',
  'nav.openMenu': 'Open menu',
  'nav.wellList': 'Well List',
  'nav.reports': 'Reports',
  'nav.users': 'Users',
  'nav.subscription': 'Subscription',
  'nav.language': 'Language',
  'nav.settings': 'Settings',
  'nav.menu': 'Menu',
  'nav.closeMenu': 'Close menu',
  'nav.logout': 'Logout',

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  'auth.signIn': 'Sign In',
  'auth.phoneNumber': 'Phone Number',
  'auth.sendCode': 'Send Code',
  'auth.sending': 'Sending...',
  'auth.verifyPhone': 'Verify your phone',
  'auth.codeSentTo': 'We sent a code to {{phone}}',
  'auth.verify': 'Verify',
  'auth.verifying': 'Verifying...',
  'auth.resendCode': 'Resend code',
  'auth.resendIn': 'Resend in {{count}}s',
  'auth.didntReceive': "Didn't receive the code?",
  'auth.changePhone': 'Change phone number',
  'auth.signOut': 'Sign Out',
  'auth.signingOut': 'Signing Out...',
  'auth.signOutFailed': 'Failed to sign out. Please try again.',
  'auth.invalidPhone': 'Please enter a valid 10-digit phone number',
  'auth.noInternet': 'No internet connection. Connect to the internet to sign in.',
  'auth.noInternetVerify': 'No internet connection. Connect to the internet to verify your code.',
  'auth.noInternetResend': 'No internet connection. Connect to the internet to resend the code.',
  'auth.failedSendCode': 'Failed to send verification code',
  'auth.invalidCode': 'Invalid verification code',
  'auth.failedResend': 'Failed to resend code',
  'auth.offlineBanner': "You're offline \u2014 connect to sign in",
  'auth.usPhoneHint': 'US phone number (10 digits)',

  // Auth - No Subscription
  'auth.noFarmAccess': 'No Farm Access',
  'auth.noFarmDescription': 'Your phone number is not associated with any farm. Ask your farm administrator to add you, or subscribe to create your own farm.',
  'auth.signedInAs': 'Signed in as {{phone}}',
  'auth.visitSubscription': 'Visit subscription site',

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  'dashboard.wellList': 'Well List',
  'dashboard.newWell': 'New Well',

  // ---------------------------------------------------------------------------
  // Well
  // ---------------------------------------------------------------------------
  'well.title': 'WELLS',
  'well.searchPlaceholder': 'Find a well',
  'well.noWells': 'No wells found',
  'well.noSearchResults': 'No wells match your search',
  'well.wellMap': 'Well Map',
  'well.newWell': 'New Well',
  'well.addNewWell': 'ADD NEW WELL',
  'well.editWell': 'EDIT WELL',
  'well.wellName': 'Well Name',
  'well.wellNameRequired': 'Well name is required',
  'well.wellNamePlaceholder': 'Enter well name',
  'well.wellNameDuplicate': 'A well with this name already exists',
  'well.meterSerialNumber': 'Meter Serial Number',
  'well.serialPlaceholder': 'Serial #',
  'well.wmisNumber': 'WMIS Number',
  'well.wmisPlaceholder': 'WMIS #',
  'well.wmisRequired': 'WMIS number is required',
  'well.wmisDuplicate': 'A well with this WMIS number already exists',
  'well.latitude': 'Latitude',
  'well.longitude': 'Longitude',
  'well.units': 'Units',
  'well.multiplier': 'Multiplier',
  'well.sendMonthlyReport': 'Send monthly meter reading report',
  'well.waterDistrictEmail': 'Water District Email Address',
  'well.waterDistrictEmailPlaceholder': 'email@example.com',
  'well.invalidEmail': 'Please enter a valid email address',
  'well.batteryState': 'Battery State',
  'well.pumpState': 'Pump State',
  'well.meterStatus': 'Meter Status',
  'well.save': 'Save',
  'well.cancel': 'Cancel',
  'well.deleteWell': 'Delete Well',
  'well.deleteConfirm': 'Delete {{name}} and all its readings and allocations? This cannot be undone.',
  'well.wellUpdated': 'Well updated',
  'well.wellUpdateFailed': 'Failed to update well',
  'well.wellDeleted': 'Well deleted',
  'well.wellDeleteFailed': 'Failed to delete well',
  'well.wellAdded': '"{{name}}" added successfully',
  'well.wellAddFailed': 'Failed to save well. Please try again.',
  'well.wellNotFound': 'Well not found',
  'well.allocations': 'Allocations',
  'well.allocationsDisabledHint': 'Save the well first to add allocations',
  'well.unitsLockedHint': 'Cannot change units or multiplier after readings have been recorded',
  'well.pickLocation': 'PICK WELL LOCATION',
  'well.next': 'Next',

  // Well status
  'well.status.active': 'Active',
  'well.status.inactive': 'Inactive',
  'well.status.abandoned': 'Abandoned',
  'well.status.unknown': 'Unknown',

  // Well unit types
  'well.unitType.gallons': 'Gallons',
  'well.unitType.cubicFeet': 'Cubic Feet',
  'well.unitType.acreFeet': 'Acre-Feet',
  'well.unitType.galHeader': 'GALLONS',
  'well.unitType.cfHeader': 'CUBIC FEET',
  'well.unitType.afHeader': 'ACRE-FEET',

  // Well equipment states
  'well.equipment.ok': 'Ok',
  'well.equipment.dead': 'Dead',
  'well.equipment.low': 'Low',
  'well.equipment.critical': 'Critical',
  'well.equipment.unknown': 'Unknown',

  // ---------------------------------------------------------------------------
  // Well Detail
  // ---------------------------------------------------------------------------
  'wellDetail.back': 'Back',
  'wellDetail.edit': 'Edit',
  'wellDetail.lastUpdated': 'Last Updated {{date}}',
  'wellDetail.serialNumber': 'Serial Number',
  'wellDetail.wmis': 'WMIS #',
  'wellDetail.usage': 'Usage',
  'wellDetail.allocatedAf': 'Allocated (AF)',
  'wellDetail.usedAf': 'Used (AF)',
  'wellDetail.remainingAf': '{{value}} Remaining (AF)',
  'wellDetail.pump': 'Pump',
  'wellDetail.battery': 'Battery',
  'wellDetail.inRangeOfWell': 'In Range of Well',
  'wellDetail.outOfRange': 'Out of Range',

  // ---------------------------------------------------------------------------
  // Readings
  // ---------------------------------------------------------------------------
  'reading.title': 'READINGS',
  'reading.newReading': 'New Reading',
  'reading.readingDetails': 'Reading Details',
  'reading.noReadings': 'No available readings',
  'reading.dateHeader': 'Date',
  'reading.userTimeHeader': 'User / Time',
  'reading.meterValue': 'Meter Value',
  'reading.validationRequired': 'Reading value is required',
  'reading.validationNumber': 'Please enter a valid number',
  'reading.validationPositive': 'Reading must be a positive number',
  'reading.saved': 'Reading saved',
  'reading.saveFailed': 'Failed to save reading',
  'reading.deleted': 'Reading deleted',
  'reading.deleteFailed': 'Failed to delete reading',
  'reading.deleteConfirm': 'Delete the reading {{value}} from {{date}}? This cannot be undone.',
  'reading.saving': 'Saving...',
  'reading.save': 'Save',
  'reading.tab.reading': 'Reading',
  'reading.tab.meterProblem': 'Meter Problem',
  'reading.inRange': 'In Range',
  'reading.outOfRange': 'Out of Range',

  // Reading - Similar Warning
  'reading.similarTitle': 'Similar Reading',
  'reading.similarDescription': 'This reading is within 50 gallons of the last recorded reading',
  'reading.similarCheck': 'Double check the meter',
  'reading.goBack': 'Go Back',
  'reading.continue': 'Continue',

  // Reading - Range Warning
  'reading.rangeTitle': 'GPS Coordinates Incorrect',
  'reading.rangeCheck1': 'Are you at the right well?',
  'reading.rangeCheck2': 'Check your device GPS',

  // Reading - GPS Failed
  'reading.gpsUnavailable': 'GPS Unavailable',
  'reading.gpsFailedDesc1': 'Could not capture your location',
  'reading.gpsFailedDesc2': 'The reading will be saved without GPS data',
  'reading.retry': 'Retry',
  'reading.saveWithoutGps': 'Save Without GPS',

  // Reading - Meter Problems
  'reading.problem.notWorking': 'Not Working',
  'reading.problem.batteryDead': 'Battery Dead',
  'reading.problem.pumpOff': 'Pump Off',
  'reading.problem.deadPump': 'Dead Pump',
  'reading.problemReported': 'Problem reported',
  'reading.problemFailed': 'Failed to report problem',
  'reading.submit': 'Submit',
  'reading.submitting': 'Submitting...',

  // Reading Detail Page
  'readingDetail.back': 'Back',
  'readingDetail.gpsOffBy': 'GPS reading was off by {{feet}} feet',
  'readingDetail.similarReading': 'Reading is within 50 gallons of the previous reading',
  'readingDetail.dateLabel': 'DATE',
  'readingDetail.meterReading': 'Meter Reading',
  'readingDetail.submittedBy': 'SUBMITTED BY',
  'readingDetail.deleteReading': 'Delete',

  // ---------------------------------------------------------------------------
  // Allocations
  // ---------------------------------------------------------------------------
  'allocation.title': 'EDIT WELL ALLOCATIONS',
  'allocation.addAllocation': 'Add Allocation',
  'allocation.allocations': 'Allocations',
  'allocation.noAllocations': "No allocations yet. Tap '+ Add Allocation' to create one.",
  'allocation.selectOrAdd': 'Select or Add an Allocation Below',
  'allocation.startDate': 'Start Date',
  'allocation.endDate': 'End Date',
  'allocation.allocatedAf': 'Allocated (AF)',
  'allocation.startingReading': 'Starting Reading',
  'allocation.startingReadingPlaceholder': 'Baseline meter value',
  'allocation.usedAf': 'Used (AF)',
  'allocation.start': 'Start',
  'allocation.end': 'End',
  'allocation.saved': 'Allocation saved',
  'allocation.saveFailed': 'Failed to save allocation',
  'allocation.deleted': 'Allocation deleted',
  'allocation.deleteFailed': 'Failed to delete allocation',
  'allocation.deleteConfirm': 'Delete the allocation period {{period}}? This cannot be undone.',
  'allocation.overlapError': 'This period overlaps with an existing allocation',
  'allocation.dateError': 'End date must be on or after start date',
  'allocation.amountError': 'Allocated AF must be greater than 0',
  'allocation.backToWell': 'Back to Well',
  'allocation.period_one': '{{count}} Period',
  'allocation.period_other': '{{count}} Periods',
  'allocation.updatedToday': 'Updated Today',
  'allocation.updatedYesterday': 'Updated Yesterday',
  'allocation.updatedDaysAgo': 'Updated {{count}} days ago',
  'allocation.updatedDate': 'Updated {{date}}',

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  'user.title': 'USERS',
  'user.newUser': 'New User',
  'user.addNewUser': 'ADD NEW USER',
  'user.inviteSent': 'INVITE SENT',
  'user.noMembers': 'No members yet',
  'user.you': '(You)',
  'user.unknown': 'Unknown',
  'user.firstName': 'First Name',
  'user.lastName': 'Last Name',
  'user.firstNamePlaceholder': 'First name',
  'user.lastNamePlaceholder': 'Last name',
  'user.phoneNumber': 'Phone Number',
  'user.email': 'Email',
  'user.emailPlaceholder': 'Optional',
  'user.invalidEmail': 'Please enter a valid email address',
  'user.role': 'Role',
  'user.firstNameRequired': 'First name is required',
  'user.lastNameRequired': 'Last name is required',
  'user.invalidPhone': 'Please enter a valid 10-digit phone number',
  'user.sendInvite': 'Send Invite',
  'user.sending': 'Sending...',
  'user.done': 'Done',
  'user.inviteSentTo': '{{type}} {{phone}}',
  'user.userAdded': 'User added',
  'user.inviteSentLabel': 'Invite sent to',
  'user.smsWarning': 'SMS could not be sent. Please notify the user manually.',
  'user.failedInvite': 'Failed to send invite',
  'user.alreadyMember': 'This person is already a member of your farm',
  'user.alreadyInvited': 'An invite for this phone number already exists',
  'user.removeUser': 'Remove User',
  'user.removeConfirm': 'Remove {{name}} from your farm? They will lose access and can be re-invited later.',
  'user.removeButton': 'Remove',
  'user.removing': 'Removing...',
  'user.failedRemove': 'Failed to remove member',
  'user.cannotRemoveSelf': 'You cannot remove yourself from the farm',
  'user.cannotRemoveOwner': 'Cannot remove the farm owner',
  'user.noLongerMember': 'This user is no longer a member',
  'user.loadingLimits': 'Loading plan limits...',
  'user.allSeatsFull': 'All seats are filled',
  'user.seatLimitDesc': 'Your plan allows {{adminLimit}} admin and {{mcLimit}} meter checkers.',
  'user.contactOwner': 'Contact your farm owner to upgrade',
  'user.meterCheckerLabel': 'Meter Checker',
  'user.adminLabel': 'Admin',
  'user.full': '(Full)',

  // ---------------------------------------------------------------------------
  // Pending Invites
  // ---------------------------------------------------------------------------
  'invite.title': 'Pending Invites',
  'invite.statusJoined': 'Joined',
  'invite.statusExpired': 'Expired',
  'invite.statusPending': 'Pending',
  'invite.failedRevoke': 'Failed to revoke invite',

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  'settings.title': 'SETTINGS',
  'settings.profile': 'Profile',
  'settings.edit': 'Edit',
  'settings.name': 'Name',
  'settings.firstName': 'First Name',
  'settings.lastName': 'Last Name',
  'settings.email': 'Email',
  'settings.emailPlaceholder': 'Optional',
  'settings.save': 'Save',
  'settings.saving': 'Saving...',
  'settings.cancel': 'Cancel',
  'settings.profileUpdated': 'Profile updated successfully',
  'settings.firstNameRequired': 'First name is required',
  'settings.lastNameRequired': 'Last name is required',
  'settings.failedUpdate': 'Failed to update profile',
  'settings.subscription': 'Subscription',
  'settings.manageSubscription': 'Manage Subscription',
  'settings.account': 'Account',
  'settings.phoneNumber': 'Phone Number',
  'settings.farmId': 'Farm ID',
  'settings.role': 'Role',
  'settings.signOut': 'Sign Out',
  'settings.failedSignOut': 'Failed to sign out',

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------
  'subscription.title': 'SUBSCRIPTION',
  'subscription.admins': 'Admins',
  'subscription.meterCheckers': 'Meter Checkers',
  'subscription.wells': 'Wells',
  'subscription.full': 'Full',
  'subscription.managePlan': 'Manage Plan',

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------
  'reports.title': 'AUTOMATED REPORTING',
  'reports.subtitle': 'Owner and admin users, plus the users listed below, will receive a monthly well reading report on the <strong>15th</strong> of each month, including the most recent reading available as of that date.',
  'reports.emailList': 'Email List',
  'reports.roleOwner': 'Owner',
  'reports.roleAdmin': 'Admin',
  'reports.addEmail': 'Add Email',
  'reports.emailPlaceholder': 'email@example.com',
  'reports.invalidEmail': 'Please enter a valid email address',
  'reports.emailExists': 'This email is already in the list',
  'reports.addEmailFailed': 'Failed to add email. Please try again.',
  'reports.add': 'Add',
  'reports.sendMonthly': 'Send Monthly Report Now',
  'reports.sendingReport': 'Sending Report...',
  'reports.downloadCsv': 'Download CSV Preview',
  'reports.generating': 'Generating...',
  'reports.failedSend': 'Failed to send report',
  'reports.failedGenerate': 'Failed to generate report',
  'reports.downloadSuccess': 'Report downloaded ({{wellCount}} wells, {{readingCount}} readings)',

  // ---------------------------------------------------------------------------
  // Language
  // ---------------------------------------------------------------------------
  'language.title': 'LANGUAGE',
  'language.subtitle': 'Set your preferred language',

  // ---------------------------------------------------------------------------
  // Confirm Dialogs
  // ---------------------------------------------------------------------------
  'confirm.cancel': 'Cancel',
  'confirm.delete': 'Delete',
  'confirm.deleting': 'Deleting...',

  // ---------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------
  'error.somethingWrong': 'Something went wrong',
  'error.tapToRetry': 'Tap to try again.',
  'error.tryAgain': 'Try Again',
  'error.pageLoadFailed': 'Something went wrong loading this page.',
  'error.appUpdatedReloading': 'App updated \u2014 reloading...',
  'error.offlineCheck': 'You appear to be offline. Check your connection and try again.',
  'error.reload': 'Reload',
  'error.signOutFailed': 'Failed to sign out. Please try again.',

  // ---------------------------------------------------------------------------
  // Location
  // ---------------------------------------------------------------------------
  'location.useLocation': 'Use your location?',
  'location.locationBlocked': 'Location access blocked',
  'location.promptDescription': 'Your location helps center the map and find nearby wells. We only use it while the app is open.',
  'location.deniedDescription': 'Location permission was denied. To enable it, open your browser settings and allow location access for this site.',
  'location.allow': 'Allow',
  'location.noThanks': 'No Thanks',
  'location.gotIt': 'Got It',
  'location.permissionDenied': 'Location permission denied',
  'location.requestTimedOut': 'Location request timed out',
  'location.unableToGet': 'Unable to get location',
  'location.notSupported': 'Geolocation is not supported by this browser.',
  'location.permissionDeniedLong': 'Location permission denied. Please enable location access in your browser settings.',
  'location.timedOutRetry': 'Location request timed out. Try again.',
  'location.unableManual': 'Unable to get location. Please enter manually.',

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------
  'sync.offline': 'Offline \u2014 changes saved locally',
  'sync.error': 'Sync error \u2014 retrying\u2026',
  'sync.syncing': 'Syncing\u2026',

  // ---------------------------------------------------------------------------
  // Map Offline
  // ---------------------------------------------------------------------------
  'map.tilesUnavailable': 'Map tiles unavailable',
  'map.youreOffline': "You're offline",
  'map.wellLocationsVisible_one': '{{count}} well location is still visible.',
  'map.wellLocationsVisible_other': '{{count}} well locations are still visible.',
  'map.connectToLoad': 'Connect to load the map.',
  'map.tryAgain': 'Try again',
  'map.wellMarkersVisible': 'Well markers visible',

  // ---------------------------------------------------------------------------
  // Offline Message (full page)
  // ---------------------------------------------------------------------------
  'offline.title': "You're Offline",
  'offline.description': 'Connect to the internet to sign in. You need a network connection to receive the verification code.',

  // ---------------------------------------------------------------------------
  // Time (relative)
  // ---------------------------------------------------------------------------
  'time.today': 'Today',
  'time.yesterday': 'Yesterday',
  'time.justNow': 'just now',
  'time.noReadings': 'No readings',
  'time.todayAt': 'Today at {{time}}',
  'time.yesterdayAt': 'Yesterday at {{time}}',
  'time.dateAt': '{{date}} at {{time}}',
  'time.daysAgo_one': '{{count}} day ago',
  'time.daysAgo_other': '{{count}} days ago',
  'time.weeksAgo_one': '{{count}} week ago',
  'time.weeksAgo_other': '{{count}} weeks ago',
  'time.monthsAgo_one': '{{count}} month ago',
  'time.monthsAgo_other': '{{count}} months ago',

  // ---------------------------------------------------------------------------
  // Common
  // ---------------------------------------------------------------------------
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.loading': 'Loading...',
  'common.ok': 'OK',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.done': 'Done',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.none': 'None',
  'common.required': 'Required',
  'common.optional': 'Optional',

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
  'toast.wellCreated': 'Well created',
  'toast.wellUpdated': 'Well updated',
  'toast.wellDeleted': 'Well deleted',
  'toast.readingSaved': 'Reading saved',
  'toast.readingDeleted': 'Reading deleted',
  'toast.allocationSaved': 'Allocation saved',
  'toast.allocationDeleted': 'Allocation deleted',
  'toast.profileUpdated': 'Profile updated',

  // ---------------------------------------------------------------------------
  // Limit Modals
  // ---------------------------------------------------------------------------
  'limit.wellLimitReached': 'Well Limit Reached',
  'limit.wellLimitDescription': "You've reached your well limit. Upgrade your plan for more wells.",
  'limit.upgradePlan': 'Upgrade Plan',

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  'role.superAdmin': 'Super Admin',
  'role.owner': 'Owner',
  'role.admin': 'Admin',
  'role.meterChecker': 'Meter Checker',
};

export default en;
