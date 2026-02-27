const es: Record<string, string> = {
  // ---------------------------------------------------------------------------
  // App
  // ---------------------------------------------------------------------------
  'app.waterTracker': 'Rastreador de Agua',

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  'nav.map': 'Mapa',
  'nav.openMenu': 'Abrir menu',
  'nav.wellList': 'Lista de Pozos',
  'nav.reports': 'Reportes',
  'nav.users': 'Usuarios',
  'nav.subscription': 'Suscripcion',
  'nav.language': 'Idioma',
  'nav.settings': 'Configuracion',
  'nav.menu': 'Menu',
  'nav.closeMenu': 'Cerrar menu',
  'nav.logout': 'Cerrar Sesion',

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  'auth.signIn': 'Iniciar Sesion',
  'auth.phoneNumber': 'Numero de Telefono',
  'auth.sendCode': 'Enviar Codigo',
  'auth.sending': 'Enviando...',
  'auth.verifyPhone': 'Verifica tu telefono',
  'auth.codeSentTo': 'Enviamos un codigo a {{phone}}',
  'auth.verify': 'Verificar',
  'auth.verifying': 'Verificando...',
  'auth.resendCode': 'Reenviar codigo',
  'auth.resendIn': 'Reenviar en {{count}}s',
  'auth.didntReceive': 'No recibiste el codigo?',
  'auth.changePhone': 'Cambiar numero de telefono',
  'auth.signOut': 'Cerrar Sesion',
  'auth.signingOut': 'Cerrando Sesion...',
  'auth.signOutFailed': 'Error al cerrar sesion. Intenta de nuevo.',
  'auth.invalidPhone': 'Ingresa un numero de telefono valido de 10 digitos',
  'auth.noInternet': 'Sin conexion a internet. Conectate para iniciar sesion.',
  'auth.noInternetVerify': 'Sin conexion a internet. Conectate para verificar tu codigo.',
  'auth.noInternetResend': 'Sin conexion a internet. Conectate para reenviar el codigo.',
  'auth.failedSendCode': 'Error al enviar el codigo de verificacion',
  'auth.invalidCode': 'Codigo de verificacion invalido',
  'auth.failedResend': 'Error al reenviar el codigo',
  'auth.offlineBanner': 'Sin conexion \u2014 conectate para iniciar sesion',
  'auth.usPhoneHint': 'Numero de telefono de EE.UU. (10 digitos)',

  // Auth - No Subscription
  'auth.noFarmAccess': 'Sin Acceso a Finca',
  'auth.noFarmDescription': 'Tu numero de telefono no esta asociado a ninguna finca. Pide a tu administrador que te agregue, o suscribete para crear tu propia finca.',
  'auth.signedInAs': 'Conectado como {{phone}}',
  'auth.visitSubscription': 'Visitar sitio de suscripcion',

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  'dashboard.wellList': 'Lista de Pozos',
  'dashboard.newWell': 'Nuevo Pozo',

  // ---------------------------------------------------------------------------
  // Well
  // ---------------------------------------------------------------------------
  'well.title': 'POZOS',
  'well.searchPlaceholder': 'Buscar un pozo',
  'well.noWells': 'No se encontraron pozos',
  'well.noSearchResults': 'Ningun pozo coincide con tu busqueda',
  'well.wellMap': 'Mapa de Pozos',
  'well.newWell': 'Nuevo Pozo',
  'well.addNewWell': 'AGREGAR NUEVO POZO',
  'well.editWell': 'EDITAR POZO',
  'well.wellName': 'Nombre del Pozo',
  'well.wellNameRequired': 'El nombre del pozo es requerido',
  'well.wellNamePlaceholder': 'Ingresa nombre del pozo',
  'well.wellNameDuplicate': 'Ya existe un pozo con este nombre',
  'well.meterSerialNumber': 'Numero de Serie del Medidor',
  'well.serialPlaceholder': 'Serie #',
  'well.wmisNumber': 'Numero WMIS',
  'well.wmisPlaceholder': 'WMIS #',
  'well.wmisRequired': 'El numero WMIS es requerido',
  'well.wmisDuplicate': 'Ya existe un pozo con este numero WMIS',
  'well.latitude': 'Latitud',
  'well.longitude': 'Longitud',
  'well.units': 'Unidades',
  'well.multiplier': 'Multiplicador',
  'well.sendMonthlyReport': 'Enviar reporte mensual de lecturas de medidor',
  'well.waterDistrictEmail': 'Correo del Distrito de Agua',
  'well.waterDistrictEmailPlaceholder': 'correo@ejemplo.com',
  'well.invalidEmail': 'Ingresa una direccion de correo valida',
  'well.batteryState': 'Estado de Bateria',
  'well.pumpState': 'Estado de Bomba',
  'well.meterStatus': 'Estado del Medidor',
  'well.save': 'Guardar',
  'well.cancel': 'Cancelar',
  'well.deleteWell': 'Eliminar Pozo',
  'well.deleteConfirm': 'Eliminar {{name}} y todas sus lecturas y asignaciones? Esto no se puede deshacer.',
  'well.wellUpdated': 'Pozo actualizado',
  'well.wellUpdateFailed': 'Error al actualizar el pozo',
  'well.wellDeleted': 'Pozo eliminado',
  'well.wellDeleteFailed': 'Error al eliminar el pozo',
  'well.wellAdded': '"{{name}}" agregado exitosamente',
  'well.wellAddFailed': 'Error al guardar el pozo. Intenta de nuevo.',
  'well.wellNotFound': 'Pozo no encontrado',
  'well.allocations': 'Asignaciones',
  'well.allocationsDisabledHint': 'Guarda el pozo primero para agregar asignaciones',
  'well.unitsLockedHint': 'No se pueden cambiar unidades o multiplicador despues de registrar lecturas',
  'well.pickLocation': 'SELECCIONAR UBICACION DEL POZO',
  'well.next': 'Siguiente',

  // Well status
  'well.status.active': 'Activo',
  'well.status.inactive': 'Inactivo',
  'well.status.abandoned': 'Abandonado',
  'well.status.unknown': 'Desconocido',

  // Well unit types
  'well.unitType.gallons': 'Galones',
  'well.unitType.cubicFeet': 'Pies Cubicos',
  'well.unitType.acreFeet': 'Acres-Pie',
  'well.unitType.galHeader': 'GALONES',
  'well.unitType.cfHeader': 'PIES CUBICOS',
  'well.unitType.afHeader': 'ACRES-PIE',

  // Well equipment states
  'well.equipment.ok': 'Bueno',
  'well.equipment.dead': 'Muerta',
  'well.equipment.low': 'Bajo',
  'well.equipment.critical': 'Critico',
  'well.equipment.unknown': 'Desconocido',

  // ---------------------------------------------------------------------------
  // Well Detail
  // ---------------------------------------------------------------------------
  'wellDetail.back': 'Volver',
  'wellDetail.edit': 'Editar',
  'wellDetail.lastUpdated': 'Ultima Actualizacion {{date}}',
  'wellDetail.serialNumber': 'Numero de Serie',
  'wellDetail.wmis': 'WMIS #',
  'wellDetail.usage': 'Uso',
  'wellDetail.allocatedAf': 'Asignado (AF)',
  'wellDetail.usedAf': 'Usado (AF)',
  'wellDetail.remainingAf': '{{value}} Restante (AF)',
  'wellDetail.pump': 'Bomba',
  'wellDetail.battery': 'Bateria',
  'wellDetail.inRangeOfWell': 'En Rango del Pozo',
  'wellDetail.outOfRange': 'Fuera de Rango',

  // ---------------------------------------------------------------------------
  // Readings
  // ---------------------------------------------------------------------------
  'reading.title': 'LECTURAS',
  'reading.newReading': 'Nueva Lectura',
  'reading.readingDetails': 'Detalles de Lectura',
  'reading.noReadings': 'No hay lecturas disponibles',
  'reading.dateHeader': 'Fecha',
  'reading.userTimeHeader': 'Usuario / Hora',
  'reading.meterValue': 'Valor del Medidor',
  'reading.validationRequired': 'El valor de lectura es requerido',
  'reading.validationNumber': 'Ingresa un numero valido',
  'reading.validationPositive': 'La lectura debe ser un numero positivo',
  'reading.saved': 'Lectura guardada',
  'reading.saveFailed': 'Error al guardar la lectura',
  'reading.deleted': 'Lectura eliminada',
  'reading.deleteFailed': 'Error al eliminar la lectura',
  'reading.deleteConfirm': 'Eliminar la lectura {{value}} del {{date}}? Esto no se puede deshacer.',
  'reading.saving': 'Guardando...',
  'reading.save': 'Guardar',
  'reading.tab.reading': 'Lectura',
  'reading.tab.meterProblem': 'Problema del Medidor',
  'reading.inRange': 'En Rango',
  'reading.outOfRange': 'Fuera de Rango',

  // Reading - Similar Warning
  'reading.similarTitle': 'Lectura Similar',
  'reading.similarDescription': 'Esta lectura esta dentro de 50 galones de la ultima lectura registrada',
  'reading.similarCheck': 'Revisa el medidor nuevamente',
  'reading.goBack': 'Volver',
  'reading.continue': 'Continuar',

  // Reading - Range Warning
  'reading.rangeTitle': 'Coordenadas GPS Incorrectas',
  'reading.rangeCheck1': 'Estas en el pozo correcto?',
  'reading.rangeCheck2': 'Revisa el GPS de tu dispositivo',

  // Reading - GPS Failed
  'reading.gpsUnavailable': 'GPS No Disponible',
  'reading.gpsFailedDesc1': 'No se pudo capturar tu ubicacion',
  'reading.gpsFailedDesc2': 'La lectura se guardara sin datos GPS',
  'reading.retry': 'Reintentar',
  'reading.saveWithoutGps': 'Guardar Sin GPS',

  // Reading - Meter Problems
  'reading.problem.notWorking': 'No Funciona',
  'reading.problem.batteryDead': 'Bateria Muerta',
  'reading.problem.pumpOff': 'Bomba Apagada',
  'reading.problem.deadPump': 'Bomba Muerta',
  'reading.problemReported': 'Problema reportado',
  'reading.problemFailed': 'Error al reportar el problema',
  'reading.submit': 'Enviar',
  'reading.submitting': 'Enviando...',

  // Reading Detail Page
  'readingDetail.back': 'Volver',
  'readingDetail.gpsOffBy': 'La lectura GPS estuvo fuera por {{feet}} pies',
  'readingDetail.similarReading': 'La lectura esta dentro de 50 galones de la lectura anterior',
  'readingDetail.dateLabel': 'FECHA',
  'readingDetail.meterReading': 'Lectura del Medidor',
  'readingDetail.submittedBy': 'ENVIADO POR',
  'readingDetail.deleteReading': 'Eliminar',

  // ---------------------------------------------------------------------------
  // Allocations
  // ---------------------------------------------------------------------------
  'allocation.title': 'EDITAR ASIGNACIONES DEL POZO',
  'allocation.addAllocation': 'Agregar Asignacion',
  'allocation.allocations': 'Asignaciones',
  'allocation.noAllocations': "Aun no hay asignaciones. Toca '+ Agregar Asignacion' para crear una.",
  'allocation.selectOrAdd': 'Selecciona o Agrega una Asignacion Abajo',
  'allocation.startDate': 'Fecha de Inicio',
  'allocation.endDate': 'Fecha de Fin',
  'allocation.allocatedAf': 'Asignado (AF)',
  'allocation.startingReading': 'Lectura Inicial',
  'allocation.startingReadingPlaceholder': 'Valor base del medidor',
  'allocation.usedAf': 'Usado (AF)',
  'allocation.start': 'Inicio',
  'allocation.end': 'Fin',
  'allocation.saved': 'Asignacion guardada',
  'allocation.saveFailed': 'Error al guardar la asignacion',
  'allocation.deleted': 'Asignacion eliminada',
  'allocation.deleteFailed': 'Error al eliminar la asignacion',
  'allocation.deleteConfirm': 'Eliminar el periodo de asignacion {{period}}? Esto no se puede deshacer.',
  'allocation.overlapError': 'Este periodo se superpone con una asignacion existente',
  'allocation.dateError': 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
  'allocation.amountError': 'El AF asignado debe ser mayor a 0',
  'allocation.backToWell': 'Volver al Pozo',
  'allocation.period_one': '{{count}} Periodo',
  'allocation.period_other': '{{count}} Periodos',
  'allocation.updatedToday': 'Actualizado Hoy',
  'allocation.updatedYesterday': 'Actualizado Ayer',
  'allocation.updatedDaysAgo': 'Actualizado hace {{count}} dias',
  'allocation.updatedDate': 'Actualizado {{date}}',

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  'user.title': 'USUARIOS',
  'user.newUser': 'Nuevo Usuario',
  'user.addNewUser': 'AGREGAR NUEVO USUARIO',
  'user.inviteSent': 'INVITACION ENVIADA',
  'user.noMembers': 'Aun no hay miembros',
  'user.you': '(Tu)',
  'user.unknown': 'Desconocido',
  'user.firstName': 'Nombre',
  'user.lastName': 'Apellido',
  'user.firstNamePlaceholder': 'Nombre',
  'user.lastNamePlaceholder': 'Apellido',
  'user.phoneNumber': 'Numero de Telefono',
  'user.email': 'Correo Electronico',
  'user.emailPlaceholder': 'Opcional',
  'user.invalidEmail': 'Ingresa un correo electronico valido',
  'user.role': 'Rol',
  'user.firstNameRequired': 'El nombre es requerido',
  'user.lastNameRequired': 'El apellido es requerido',
  'user.invalidPhone': 'Ingresa un numero de telefono valido de 10 digitos',
  'user.sendInvite': 'Enviar Invitacion',
  'user.sending': 'Enviando...',
  'user.done': 'Listo',
  'user.inviteSentTo': '{{type}} {{phone}}',
  'user.userAdded': 'Usuario agregado',
  'user.inviteSentLabel': 'Invitacion enviada a',
  'user.smsWarning': 'No se pudo enviar el SMS. Notifica al usuario manualmente.',
  'user.failedInvite': 'Error al enviar la invitacion',
  'user.alreadyMember': 'Esta persona ya es miembro de tu finca',
  'user.alreadyInvited': 'Ya existe una invitacion para este numero de telefono',
  'user.removeUser': 'Eliminar Usuario',
  'user.removeConfirm': 'Eliminar a {{name}} de tu finca? Perdera acceso y puede ser re-invitado despues.',
  'user.removeButton': 'Eliminar',
  'user.removing': 'Eliminando...',
  'user.failedRemove': 'Error al eliminar miembro',
  'user.cannotRemoveSelf': 'No puedes eliminarte a ti mismo de la finca',
  'user.cannotRemoveOwner': 'No se puede eliminar al propietario de la finca',
  'user.noLongerMember': 'Este usuario ya no es miembro',
  'user.loadingLimits': 'Cargando limites del plan...',
  'user.allSeatsFull': 'Todos los puestos estan ocupados',
  'user.seatLimitDesc': 'Tu plan permite {{adminLimit}} administradores y {{mcLimit}} lectores de medidores.',
  'user.contactOwner': 'Contacta al propietario de tu finca para mejorar el plan',
  'user.meterCheckerLabel': 'Lector de Medidores',
  'user.adminLabel': 'Administrador',
  'user.full': '(Lleno)',

  // ---------------------------------------------------------------------------
  // Pending Invites
  // ---------------------------------------------------------------------------
  'invite.title': 'Invitaciones Pendientes',
  'invite.statusJoined': 'Unido',
  'invite.statusExpired': 'Expirada',
  'invite.statusPending': 'Pendiente',
  'invite.failedRevoke': 'Error al revocar la invitacion',

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  'settings.title': 'CONFIGURACION',
  'settings.profile': 'Perfil',
  'settings.edit': 'Editar',
  'settings.name': 'Nombre',
  'settings.firstName': 'Nombre',
  'settings.lastName': 'Apellido',
  'settings.email': 'Correo Electronico',
  'settings.emailPlaceholder': 'Opcional',
  'settings.save': 'Guardar',
  'settings.saving': 'Guardando...',
  'settings.cancel': 'Cancelar',
  'settings.profileUpdated': 'Perfil actualizado exitosamente',
  'settings.firstNameRequired': 'El nombre es requerido',
  'settings.lastNameRequired': 'El apellido es requerido',
  'settings.failedUpdate': 'Error al actualizar el perfil',
  'settings.subscription': 'Suscripcion',
  'settings.manageSubscription': 'Administrar Suscripcion',
  'settings.account': 'Cuenta',
  'settings.phoneNumber': 'Numero de Telefono',
  'settings.farmId': 'ID de Finca',
  'settings.role': 'Rol',
  'settings.signOut': 'Cerrar Sesion',
  'settings.failedSignOut': 'Error al cerrar sesion',

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------
  'subscription.title': 'SUSCRIPCION',
  'subscription.admins': 'Administradores',
  'subscription.meterCheckers': 'Lectores de Medidores',
  'subscription.wells': 'Pozos',
  'subscription.full': 'Lleno',
  'subscription.managePlan': 'Administrar Plan',

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------
  'reports.title': 'REPORTES AUTOMATIZADOS',
  'reports.subtitle': 'Los usuarios propietarios y administradores, junto con los usuarios listados a continuacion, recibiran un reporte mensual de lecturas de pozos el <strong>15</strong> de cada mes, incluyendo la lectura mas reciente disponible a esa fecha.',
  'reports.emailList': 'Lista de Correos',
  'reports.roleOwner': 'Propietario',
  'reports.roleAdmin': 'Admin',
  'reports.addEmail': 'Agregar Correo',
  'reports.emailPlaceholder': 'correo@ejemplo.com',
  'reports.invalidEmail': 'Ingresa una direccion de correo valida',
  'reports.emailExists': 'Este correo ya esta en la lista',
  'reports.addEmailFailed': 'Error al agregar correo. Intenta de nuevo.',
  'reports.add': 'Agregar',
  'reports.sendMonthly': 'Enviar Reporte Mensual Ahora',
  'reports.sendingReport': 'Enviando Reporte...',
  'reports.downloadCsv': 'Descargar Vista Previa CSV',
  'reports.generating': 'Generando...',
  'reports.failedSend': 'Error al enviar el reporte',
  'reports.failedGenerate': 'Error al generar el reporte',
  'reports.downloadSuccess': 'Reporte descargado ({{wellCount}} pozos, {{readingCount}} lecturas)',

  // ---------------------------------------------------------------------------
  // Language
  // ---------------------------------------------------------------------------
  'language.title': 'IDIOMA',
  'language.subtitle': 'Establece tu idioma preferido',

  // ---------------------------------------------------------------------------
  // Confirm Dialogs
  // ---------------------------------------------------------------------------
  'confirm.cancel': 'Cancelar',
  'confirm.delete': 'Eliminar',
  'confirm.deleting': 'Eliminando...',

  // ---------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------
  'error.somethingWrong': 'Algo salio mal',
  'error.tapToRetry': 'Toca para intentar de nuevo.',
  'error.tryAgain': 'Intentar de Nuevo',
  'error.pageLoadFailed': 'Algo salio mal al cargar esta pagina.',
  'error.appUpdatedReloading': 'App actualizada \u2014 recargando...',
  'error.offlineCheck': 'Parece que no tienes conexion. Revisa tu conexion e intenta de nuevo.',
  'error.reload': 'Recargar',
  'error.signOutFailed': 'Error al cerrar sesion. Intenta de nuevo.',

  // ---------------------------------------------------------------------------
  // Location
  // ---------------------------------------------------------------------------
  'location.useLocation': 'Usar tu ubicacion?',
  'location.locationBlocked': 'Acceso a ubicacion bloqueado',
  'location.promptDescription': 'Tu ubicacion ayuda a centrar el mapa y encontrar pozos cercanos. Solo la usamos mientras la app esta abierta.',
  'location.deniedDescription': 'El permiso de ubicacion fue denegado. Para habilitarlo, abre la configuracion de tu navegador y permite el acceso a la ubicacion para este sitio.',
  'location.allow': 'Permitir',
  'location.noThanks': 'No Gracias',
  'location.gotIt': 'Entendido',
  'location.permissionDenied': 'Permiso de ubicacion denegado',
  'location.requestTimedOut': 'La solicitud de ubicacion expiro',
  'location.unableToGet': 'No se pudo obtener la ubicacion',
  'location.notSupported': 'La geolocalizacion no es compatible con este navegador.',
  'location.permissionDeniedLong': 'Permiso de ubicacion denegado. Habilita el acceso a la ubicacion en la configuracion de tu navegador.',
  'location.timedOutRetry': 'La solicitud de ubicacion expiro. Intenta de nuevo.',
  'location.unableManual': 'No se pudo obtener la ubicacion. Ingresa manualmente.',

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------
  'sync.offline': 'Sin conexion \u2014 cambios guardados localmente',
  'sync.error': 'Error de sincronizacion \u2014 reintentando\u2026',
  'sync.syncing': 'Sincronizando\u2026',

  // ---------------------------------------------------------------------------
  // Map Offline
  // ---------------------------------------------------------------------------
  'map.tilesUnavailable': 'Mapa no disponible',
  'map.youreOffline': 'Sin conexion',
  'map.wellLocationsVisible_one': '{{count}} ubicacion de pozo aun es visible.',
  'map.wellLocationsVisible_other': '{{count}} ubicaciones de pozos aun son visibles.',
  'map.connectToLoad': 'Conectate para cargar el mapa.',
  'map.tryAgain': 'Intentar de nuevo',
  'map.wellMarkersVisible': 'Marcadores de pozos visibles',

  // ---------------------------------------------------------------------------
  // Offline Message (full page)
  // ---------------------------------------------------------------------------
  'offline.title': 'Sin Conexion',
  'offline.description': 'Conectate a internet para iniciar sesion. Necesitas una conexion de red para recibir el codigo de verificacion.',

  // ---------------------------------------------------------------------------
  // Time (relative)
  // ---------------------------------------------------------------------------
  'time.today': 'Hoy',
  'time.yesterday': 'Ayer',
  'time.justNow': 'ahora mismo',
  'time.noReadings': 'Sin lecturas',
  'time.todayAt': 'Hoy a las {{time}}',
  'time.yesterdayAt': 'Ayer a las {{time}}',
  'time.dateAt': '{{date}} a las {{time}}',
  'time.daysAgo_one': 'hace {{count}} dia',
  'time.daysAgo_other': 'hace {{count}} dias',
  'time.weeksAgo_one': 'hace {{count}} semana',
  'time.weeksAgo_other': 'hace {{count}} semanas',
  'time.monthsAgo_one': 'hace {{count}} mes',
  'time.monthsAgo_other': 'hace {{count}} meses',

  // ---------------------------------------------------------------------------
  // Common
  // ---------------------------------------------------------------------------
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.back': 'Volver',
  'common.close': 'Cerrar',
  'common.loading': 'Cargando...',
  'common.ok': 'OK',
  'common.yes': 'Si',
  'common.no': 'No',
  'common.done': 'Listo',
  'common.search': 'Buscar',
  'common.filter': 'Filtrar',
  'common.none': 'Ninguno',
  'common.required': 'Requerido',
  'common.optional': 'Opcional',

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
  'toast.wellCreated': 'Pozo creado',
  'toast.wellUpdated': 'Pozo actualizado',
  'toast.wellDeleted': 'Pozo eliminado',
  'toast.readingSaved': 'Lectura guardada',
  'toast.readingDeleted': 'Lectura eliminada',
  'toast.allocationSaved': 'Asignacion guardada',
  'toast.allocationDeleted': 'Asignacion eliminada',
  'toast.profileUpdated': 'Perfil actualizado',

  // ---------------------------------------------------------------------------
  // Limit Modals
  // ---------------------------------------------------------------------------
  'limit.wellLimitReached': 'Limite de Pozos Alcanzado',
  'limit.wellLimitDescription': 'Has alcanzado tu limite de pozos. Mejora tu plan para obtener mas pozos.',
  'limit.upgradePlan': 'Mejorar Plan',

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  'role.superAdmin': 'Super Administrador',
  'role.owner': 'Propietario',
  'role.admin': 'Administrador',
  'role.meterChecker': 'Lector de Medidores',
};

export default es;
