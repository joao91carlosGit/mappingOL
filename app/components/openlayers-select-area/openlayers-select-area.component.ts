import { Component, OnInit } from '@angular/core';
import { Platform, LoadingController } from '@ionic/angular';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { Geolocation as IonGeolocation } from '@ionic-native/geolocation/ngx';
import { DatashareService } from '../../services/datashare.service';
import { UicontrollersService } from '../../services/uicontrollers.service'
import { Subscription } from 'rxjs';
import { MapDetails } from '../../services/interfaces.service'

// Open Layers
import { Map } from 'ol';
import BingMaps from 'ol/source/BingMaps';
import View from 'ol/View.js';
import Geolocation from 'ol/Geolocation.js';
import { Point, Polygon } from 'ol/geom.js';
import { fromExtent } from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { getCenter, Extent } from 'ol/extent.js';
import { transform } from 'ol/proj.js';
import { Vector as VectorSource, } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import TileLayer from 'ol/layer/Tile.js';
import { Fill, Stroke, Style, Circle as CircleStyle, } from 'ol/style.js';
import Geocoder from 'ol-geocoder/dist/ol-geocoder.js';
import { Coordinate } from 'ol/coordinate';

@Component({
	selector: 'app-openlayers-select-area',
	templateUrl: './openlayers-select-area.component.html',
	styleUrls: ['./openlayers-select-area.component.scss'],
})
export class OpenlayersSelectAreaComponent implements OnInit {
	private accuracyFeature: Feature;
	public map: Map;
	public selectedArea: number[] = [];
	private view: View;
	private source = new VectorSource();
	private vector = new VectorLayer({
		source: this.source,
		zIndex: 99
	});
	private mapHasChanged: boolean = false;

	// GPS
	private gpsFunction: boolean = false;
	private geolocation: Geolocation;
	private geolayer: VectorLayer;
	private positionFeature: Feature;

	// Declare default extension (Santa Catarina)
	private scCenter: number[] = getCenter([-6016098.1845472622662783, -3242558.9587610568851233, -5327195.9610618520528078, -3008520.9431112185120583]);
	private mapCenter: number[];

	private saveAreaSubscription = new Subscription;

	private geocoder = new Geocoder('nominatim', {
		provider: 'osm',
		lang: 'pt-BR', //en-US, fr-FR
		placeholder: 'Procurar...',
		targetType: 'text-input',
		limit: 5,
		keepOpen: false
	});

	constructor(
		private platform: Platform,
		private locationAccuracy: LocationAccuracy,
		private androidPermissions: AndroidPermissions,
		private uicontrollers: UicontrollersService,
		private ionGeolocation: IonGeolocation,
		private diagnostic: Diagnostic,
		private datashare: DatashareService,
		private loading: LoadingController
	) { }

	ngOnInit() {
		this.mapCenter = this.scCenter;
		this.loadMap(this.mapCenter);
		this.addMapFeatures();
		this.initGPS();
		this.addGeocoder();
	}

	initGPS() {
		this.gpsFunction = false;
		this.geolocation = new Geolocation({
			trackingOptions: {
				enableHighAccuracy: true
			},
			projection: 'EPSG:4326'
		});

		this.accuracyFeature = new Feature();
		this.accuracyFeature.setId("accTrackingPoint");
		this.geolocation.on('change:accuracyGeometry', () => {
			this.accuracyFeature.setGeometry(this.geolocation.getAccuracyGeometry().transform('EPSG:4326', 'EPSG:3857'));
		});

		this.positionFeature = new Feature();
		this.positionFeature.setStyle(new Style({
			image: new CircleStyle({
				radius: 6,
				fill: new Fill({
					color: '#3399CC'
				}),
				stroke: new Stroke({
					color: '#fff',
					width: 2
				})
			})
		}));
		this.positionFeature.setId("trackingPoint");

		this.geolayer = new VectorLayer({
			visible: true,
			map: this.map,
			source: new VectorSource({
				features: [this.accuracyFeature, this.positionFeature]
			})
		});

		this.turnGpsOnStart();
	}

	loadMap(newCenter) {
		//Define view
		let zoom = 14;
		if (newCenter == this.scCenter) {
			zoom = 6;
		}
		this.view = new View({
			center: this.mapCenter,
			zoom: zoom
		});

		//Load Map
		this.map = new Map({
			target: document.getElementById('map'),
			view: this.view,
			controls: []
		});

		//Update size of map to fix load error
		setTimeout(() => {
			this.map.updateSize();
		}, 750);
	}

	// GPS MANIPULATION SECTION //
	turnGpsOnStart(): Promise<void> {
		// If user is inside project perimeter, go to location
		return this.diagnostic.isGpsLocationAvailable().then(_ => {
			return this.activateGpsOnStart();
		}, error => {
			if (error === 'cordova_not_available') {
				return;

			} else {
				this.uicontrollers.presentToast("Ocorreu algum erro ao tentar obter a localização: " + error);
				return;
			}
		});
	}

	activateGpsOnStart(): Promise<void> {
		return this.checkGpsPermission().then(_ => {
			// Active device's GPS if not activated yet
			return this.diagnostic.isGpsLocationAvailable().then(success => {
				if (success) {
					this.geolocation.setTracking(true);
					if (!this.geolayer.getSource().hasFeature(this.positionFeature)) {
						this.geolayer.getSource().addFeature(this.positionFeature);
					}
					if (!this.geolayer.getSource().hasFeature(this.accuracyFeature)) {
						this.geolayer.getSource().addFeature(this.accuracyFeature);
					}

					this.geolocation.on('change', () => {
						this.gpsFunction = true;
						this.datashare.changeObservableStatus('gpsFunctionStatusObservable', true);
					});

					this.geolocation.on('change:position', () => {
						let coordinates = transform(this.geolocation.getPosition(), 'EPSG:4326', 'EPSG:3857');
						this.positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
					});

					// handle geolocation error.
					this.geolocation.on('error', error => {
						this.datashare.changeObservableStatus('gpsFunctionStatusObservable', false);
					});

				} else {
					return;
				}
			});
		});
	}

	requestGPSPermission(): Promise<void> {
		return this.locationAccuracy.canRequest().then(canRequest => {
			if (!canRequest) {
				//Show 'GPS Permission Request' dialogue
				this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(() => {
					// call method to turn on GPS
					this.askToTurnOnGPS();

				}, error => {
					//Show alert if user click on 'No Thanks'
					alert('Erro ao adquirir permissão: ' + error);
				});
			}
		});
	}

	askToTurnOnGPS(): Promise<void> {
		return this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(_value => {
			return;
		},
			error => {
				if (error.code === 3) {
					return;

				} else if (error.code === -1) {
					return;

				} else {
					alert('Erro na requisição de permissão para acesso a localização: ' + JSON.stringify(error));
					return;
				}
			}
		);
	}

	addMapFeatures() {
		// Declare satellite source and add to map
		let BingSource = new BingMaps({
			key: 'AvT6yNhWlIwqv21lC88L34bDeXl125BmGS6DN4aYYMvc1pg_0TX9anISvpXkOR7r',
			imagerySet: 'Aerial',
			// use maxZoom 19 to see stretched tiles instead of the BingMaps
			// "no photos at this zoom level" tiles
			maxZoom: 19
		});
		let tileBackground = new TileLayer({
			source: BingSource
		});
		this.map.addLayer(tileBackground);

		// Add vector style
		this.vector.setStyle(new Style({
			fill: new Fill({
				color: 'rgba(0, 0, 0, 0.2)'
			}),
			//Line thickness after draw
			stroke: new Stroke({
				color: '#ffcc33',
				width: 2
			}),
			image: new CircleStyle({
				radius: 7,
				fill: new Fill({
					color: '#ffcc33'
				})
			})
		}));

		this.addInteraction();

		let feature = new Feature({
			// Polygon in EPSG 3857
			geometry: new Polygon(
				[[[-5614911.223772, -3210355.187977], [-5588769.760099, -3209285.069581], [-5583419.168119, -3237413.895990], [-5620108.941696, -3238789.762499], [-5614911.223772, -3210355.187977]]]
			),
			name: 'SelectedArea',
		});
		feature.setId('selectedArea');
		this.vector.getSource().addFeature(feature);
		this.map.addLayer(this.vector);
		this.resetSelectedArea();
	}

	ngOnDestroy() {
		this.saveAreaSubscription.unsubscribe();
	}

	addInteraction() {
		this.map.on("moveend", () => {
			this.resetSelectedArea();
		});
	}

	resetSelectedArea() {
		// Get view coordinates
		let extent: Extent = this.map.getView().calculateExtent();

		// Get center
		let center: Coordinate = this.map.getView().getCenter();

		// Get new calculated coordinates related to view
		let firstPart: number[] = [extent[0] - (extent[0] - center[0]) / 2, extent[1] - (extent[1] - center[1]) / 2];
		let secondPart: number[] = [center[0] - (center[0] - extent[2]) / 2, center[1] - (center[1] - extent[3]) / 2];
		let newExtent: Extent = firstPart.concat(secondPart) as Extent;

		// Create new geometry
		let newPolygon: Polygon = fromExtent(newExtent);
		let newFeature = new Feature({
			geometry: newPolygon,
			name: 'SelectedArea',
		});
		newFeature.setId('selectedArea')

		// Remove old coordinate
		let oldPolygon: Feature = this.vector.getSource().getFeatureById('selectedArea');
		this.vector.getSource().removeFeature(oldPolygon);

		// Apply coordinates to draw
		this.vector.getSource().addFeature(newFeature);

		// Transform and save coordinate
		let geometry: Polygon = newFeature.getGeometry() as Polygon;
		let coords: Coordinate = geometry.getInteriorPoint().getCoordinates();
		let finalCoordinateArray: Coordinate = transform([coords[0], coords[1]], 'EPSG:3857', 'EPSG:4326');

		let mapDetails: MapDetails = {
			position: finalCoordinateArray,
			zoom: this.map.getView().getZoom()
		};
		
		this.datashare.getMapDetails(mapDetails);
	}

	checkGpsPermission(): Promise<void> {
		return this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
			result => {
				if (result.hasPermission) {
					//If having permission show 'Turn On GPS' dialogue
					return this.askToTurnOnGPS();
				} else {
					//If not having permission ask for permission
					return this.requestGPSPermission();
				}
			},
			err => {
				if (this.platform.is('android')) {
					alert(err.message);
				}
			}
		);
	}

	activateGPS(): Promise<void> {
		this.mapHasChanged = false;

		//Active device's GPS if not activated yet
		return this.diagnostic.isGpsLocationAvailable().then(success => {
			//If we got permission
			if (success) {
				let latitude: number;
				let longitude: number;
				return this.ionGeolocation.getCurrentPosition().then((resp) => {
					longitude = resp.coords.longitude;
					latitude = resp.coords.latitude;
					let coordinates: number[] = [resp.coords.longitude, resp.coords.latitude]; //Transforms a coordinate from longitude/latitude to a different projection.
					let newCoordinates: number[] = transform([coordinates[0], coordinates[1]], 'EPSG:4326', 'EPSG:3857');
					this.view.setCenter(newCoordinates)
				});

			} else {
				this.uicontrollers.presentToast("Não foi possível detectar o GPS do dispositivo, verifique se está ativado!");
				return;
			}
		}, error => {
			this.uicontrollers.presentToast("Ocorreu algum erro ao tentar obter a localização: " + error);
			return;
		});
	}

	toggleGPS() {
		this.loading.create({
			message: 'Obtendo dados do GPS...'
		}).then(loading => {
			loading.present();
			this.activateGPS().then(_ => {
				loading.dismiss();
			});
		});
	}

	addGeocoder() {
		this.map.addControl(this.geocoder);

		this.geocoder.on('addresschosen', (evt) => {
			let feature = evt.feature, coord = evt.coordinate, address = evt.address;

			// Add temporary marker

			// Go to location
			this.view.fit(feature.getGeometry(), { maxZoom: 10 });
		});
	}

	zoomIn() {
		if (this.map.getView().getZoom() < 19) {
			this.map.getView().setZoom(this.map.getView().getZoom() + 1);
		}
	}

	zoomOut() {
		if (this.map.getView().getZoom() > 1) {
			this.map.getView().setZoom(this.map.getView().getZoom() - 1);
		}
	}
}