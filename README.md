# SFMapp Basic

### Initial Setting
`npm install -f`

### Config capacitor
```
npm i --save @capacitor/core @capacitor/cli @capacitor/android 
npx cap init App name "nomeAqui" App Package ID (in Java package format, no dashes) "Id aqui"
npm install @capacitor/android
npx cap add android
```
then in the `ionic.config.json` add into `"integrations": {}` add `"capacitor": {}`

### Config AndroidManifest.xml
To resolve problems to access file system. <br>
Path: `android/app/src/main/AndroidManifest.xml`. <br>
Add `android:preserveLegacyExternalStorage="true"` into `<application>` <br>
Add `<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />` after `<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />`

### NPM
`npm install @ionic/storage-angular ol @types/ol proj4 @types/proj4 @ionic-native/core @ionic-native/geolocation @ionic-native/native-geocoder @ionic-native/android-permissions @ionic-native/location-accuracy @ionic-native/file-chooser @ionic-native/file-path --save @ionic-native/file @ionic-native/zip cordova-plugin-ionic-webview @ionic-native/ionic-webview @ionic-native/camera @ionic-native/photo-viewer ngx-color-picker --save install @ionic-native/social-sharing ngx-color-picker jetifier` 

### IONIC CORDOVA PLUGIN
`npm install cordova-plugin-geolocation cordova-plugin-android-permissions cordova-plugin-request-location-accuracy cordova-plugin-filechooser cordova-plugin-filepath cordova.plugins.diagnostic @ionic-native/diagnostic cordova-plugin-file cordova-plugin-zip cordova-plugin-network-information @ionic-native/network cordova-plugin-camera com-sarriaroman-photoviewer ol-geocoder install cordova-plugin-x-socialsharing`

### AFTER ALL
`ionic build && ionic cap sync && npx jetify`

### FOR APK CREATION ON CAPACITOR USE COMAND
`ionic capacitor copy android && cd android &&  gradlew assembleDebug && cd ..`

### NGMODULE
```
@NgModule({
	declarations: [
		AppComponent
	],
	entryComponents: [],
	imports: [
		IonicStorageModule.forRoot({
			name: 'sfmapp_db',
			driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage]
		}),
		BrowserModule,
		IonicModule.forRoot(),
		AppRoutingModule,
		HttpClientModule,
		ColorPickerModule
	],
	providers: [
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		DatePipe,
		Geolocation,
		NativeGeocoder,
		AndroidPermissions,
		IonGeolocation,
		LocationAccuracy,
		Diagnostic,
		FileChooser,
		FilePath,
		File,
		Zip,
		WebView,
		Network,
		OpenlayersComponent,
		Camera,
		PhotoViewer,
		SocialSharing
	],
	bootstrap: [AppComponent],
})
```

### KNOW PROBLEMS
If you get the message "Can't resolve all parameters for" in "tsconfig.json", add to object "compilerOptions" : `"emitDecoratorMetadata": true,`
