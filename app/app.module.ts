import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder } from '@ionic-native/native-geocoder/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Geolocation as IonGeolocation } from '@ionic-native/geolocation/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { FileChooser } from '@ionic-native/file-chooser/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { File } from '@ionic-native/file/ngx';
import { Zip } from '@ionic-native/zip/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { HttpClientModule } from '@angular/common/http';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Network } from '@ionic-native/network/ngx';
import { OpenlayersComponent } from './components/openlayers/openlayers.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';

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
export class AppModule { }
