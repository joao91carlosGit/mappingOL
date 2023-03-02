import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Platform, NavController, ModalController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { DatashareService } from '../../services/datashare.service';
import { UicontrollersService } from '../../services/uicontrollers.service';
import { StorageService } from '../../services/storage-service.service';
import { LayersServiceService } from '../../services/layers-service.service';
import { NetworkService, ConnectionStatus } from '../../services/network.service';
import { GeneralService } from '../../services/general.service';
import { Geolocation as IonGeolocation } from '@ionic-native/geolocation/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { File } from '@ionic-native/file/ngx';
import { Subscription } from 'rxjs';
import { Capacitor, Plugins, } from '@capacitor/core';
const { Filesystem } = Plugins;

//Open layers imports
import Geolocation from 'ol/Geolocation.js';
import * as olProj from 'ol/proj';
import { Feature, Map } from 'ol';
import View from 'ol/View.js';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile.js';
import Overlay from 'ol/Overlay';
import { BingMaps, OSM, Vector as VectorSource } from 'ol/source.js';
import Point from 'ol/geom/Point.js';
import { transform } from 'ol/proj.js';
import { Circle as CircleStyle, Fill, Icon, Stroke } from 'ol/style.js';
import { Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Extent, getBottomLeft, getBottomRight, getTopLeft, getTopRight } from 'ol/extent.js';
import { Polygon, LineString } from 'ol/geom.js';
import XYZ from 'ol/source/XYZ';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';

import { Layer, LayerBrowser, UserFeature, PathObj } from '../../services/interfaces.service'
import { FeaturesService } from '../../services/features.service'
import KML from 'ol/format/KML';

import { ModalEditFeaturesPage } from '../../modals/modal-edit-features/modal-edit-features.page';

@Component({
	selector: 'app-openlayers',
	templateUrl: './openlayers.component.html',
	styleUrls: ['./openlayers.component.scss'],
})
export class OpenlayersComponent implements OnInit {

	@ViewChild('container') container: ElementRef;
	@ViewChild('content') content: ElementRef;

	private map: Map;
	private view: View;
	private latitude: number = 0; //latitude
	private longitude: number = 0; //longitude
	private pointType: boolean;
	private hit_tolerance: number = 4;
	private projectCenter: number[];
	private projectId: number;
	private startDate: string;
	private offlineBasemapSourcePNG: XYZ;
	private offlineBasemapSourceJPEG: XYZ;
	private geolocation: Geolocation;
	private geolayer: VectorLayer;
	private vectorPoint: VectorLayer;
	private basemapPerimeter: VectorLayer = new VectorLayer({
		source: new VectorSource()
	});
	private positionFeature: Feature;
	private accuracyFeature: Feature;
	public gpsFunction: boolean = false;
	private mapHasChanged: boolean = false;
	private tileDateIsDisabled: boolean = false;
	private offlineBasemapRangeStatus: boolean = false;
	private goToCoordinateSubscription: Subscription
	private pathSubscription: Subscription;
	private watchPathSubscription: Subscription;
	private changeFeatureVisibilitySubscription: Subscription;
	private setCoordinateSubscription: Subscription;
	private activeLayerSubscription: Subscription;
	private targetPointSubscription: Subscription;
	private gpsPointSubscription: Subscription;
	private toggleAllPointsSubscription: Subscription;
	private deleteFeatureFromMapSubscription: Subscription;
	private activeFeatureSubscription: Subscription;
	private selectLayerBackgroundSubscription: Subscription;
	private exportFeaturesSubscription: Subscription;
	public feature: Feature;
	// Used in openlayers.components.html
	private knobValues: Object = {
		lower: 8,
		upper: 12
	}
	private featureLine: Feature;
	private pathsLayer: VectorLayer;
	private uid: string;
	private tileBackground = new TileLayer();
	private overlay: Overlay;

	constructor(
		private ionGeolocation: IonGeolocation,
		public datashare: DatashareService,
		private androidPermissions: AndroidPermissions,
		private locationAccuracy: LocationAccuracy,
		private diagnostic: Diagnostic,
		private storage: Storage,
		private file: File,
		public platform: Platform,
		private webview: WebView,
		private uiService: UicontrollersService,
		private layersService: LayersServiceService,
		private networkService: NetworkService,
		private generalService: GeneralService,
		private navController: NavController,
		private storageService: StorageService,
		private featureService: FeaturesService,
		private modalController: ModalController,
		private loadingController: LoadingController
	) { }

	ngOnInit() {
		this.tileBackground.set('name', 'tileBackground');

		if (this.platform.is('cordova')) {
			this.hit_tolerance = 6;
		}

		/** Observable to set default coordinates */
		this.setCoordinateSubscription = this.datashare.setCoordinatesProjectObservable().subscribe((project) => {
			let coordinates = project['coordinates'];
			this.projectId = project['id'];
			if (coordinates === null || coordinates === undefined || coordinates.length === 0) {
				this.uiService.presentToast("É necessário definir uma área inicial para o projeto").then(_ => {
					this.navController.navigateForward('meus-projetos');
				});
			} else {
				this.longitude = coordinates[0];
				this.latitude = coordinates[1];

				this.loadMap().then(_ => {
					this.enableClick();
					this.loadLayers();
					this.checkFeatureState();
				});
			}
		});

		/** Observable to active layer in browser */
		this.activeLayerSubscription = this.datashare.activeLayerObservable().subscribe(layer => {
			this.loadLayer(layer);
		});

		//observable dat uses de getCurrentCoordinate function, datashare on map page
		this.goToCoordinateSubscription = this.datashare.goToCoordinatesObservable().subscribe(tracking => {
			this.loadingController.create({
				message: 'Obtendo dados de localização...'
			}).then(loading => {
				loading.present();
				this.getCurrentCoordinates().then(coordinates => {
					loading.dismiss();
					if (tracking) {
						this.flyTo(coordinates);
						setTimeout(_ => {
							this.activateGPS();
						}, 2000);
					} else {
						this.mapHasChanged = true;
					}
				}).catch(_ => {
					loading.dismiss();
				});
			});
		});

		// User's created paths
		this.pathsLayer = new VectorLayer({
			source: new VectorSource({ wrapX: false }),
			zIndex: 99,
			visible: true
		});
		this.pathsLayer.set('name', "PathLayer");

		// Observable to remove feature from map
		this.deleteFeatureFromMapSubscription = this.datashare.deleteFeatureFromMapObservable().subscribe(id => {
			this.removeFeatureFromMap(id);
		});

		/* Initialize OL components */
		this.initGPS();

		// Load basemap perimeter layer
		this.storage.get('basemapPerimeter').then(extension => {
			if (extension != null) {
				let feature = new Feature();
				this.basemapPerimeter.getSource().clear(); // clear source of layer
				feature.setGeometry(new Polygon([JSON.parse(extension)]));// create feature
				this.basemapPerimeter.getSource().addFeature(feature);// add feature to source
			}
		});

		//if platform is mobile convert files to coordinates
		if (this.platform.is('cordova')) {
			this.offlineBasemapSourcePNG = new XYZ({
				url: this.webview.convertFileSrc(this.file.externalDataDirectory + 'offline_tiles/{z}/{x}/{y}.png')
			});
		}

		this.loadPaths();
		this.loadOfflineBaseMap();

		this.pathSubscription = this.datashare.changePathObservable().subscribe(status => {
			if (status === true) {
				// Create LineString
				this.createLinePath();

			} else {
				// End LineString
				this.endLinePath();
			}
		});

		/** Draw point, Load and Save */
		this.targetPointSubscription = this.datashare.activeTargetPointObservable().subscribe(_ => {
			let position = this.map.getView().getCenter();
			// Create point in position
			return this.createPointInPosition(position).then(pointFeature => {
				this.openEditFeature(pointFeature);
			});
		});

		/** Draw point, Load and Save */
		this.gpsPointSubscription = this.datashare.createPointInGpsPositionObservable().subscribe(_ => {
			return this.loadingController.create({
				message: 'Adquirindo sua posição'
			}).then(loading => {
				loading.present()
				return this.getCurrentCoordinates().then(coordinates => {
					if (coordinates) {
						return this.createPointInPosition(coordinates, true).then(pointFeature => {
							loading.dismiss();
							this.openEditFeature(pointFeature);
						});
					} else {
						return this.uiService.presentToast('Não foi possível definir sua localização.').then(_ => {
							loading.dismiss();
						});
					}
				});
			})
		});

		/** Load or create the feature */
		this.activeFeatureSubscription = this.datashare.activeFeatureObservable().subscribe(id => {
			this.loadFeature(id);
		});

		/** Toggle all points */
		this.toggleAllPointsSubscription = this.datashare.toggleAllPointsObservable().subscribe(loading => {
			this.toggleAllPoints().then(_ => {
				loading.dismiss();
			});
		})

		// Draw Layer and Style - For Create Point Function - Default Green
		this.vectorPoint = new VectorLayer({
			source: new VectorSource(),
			style: new Style({
				fill: new Fill({
					color: 'rgba(0, 0, 0, 0.2)' //grey
				}),
				image: new CircleStyle({
					radius: 6,
					fill: new Fill({
						color: '#32ff32ff' //fluo-Green
					})
				})
			}),
			zIndex: 99,
			visible: true
		});
		this.vectorPoint.set('name', 'vectorPoint');
		this.changeFeatureVisibility()

		/** Select background */
		this.selectLayerBackgroundSubscription = this.datashare.selectBackgroundLayerObservable().subscribe(map => {
			this.changeLayer(map);
		});

		if (this.platform.is('cordova')) {
			this.offlineBasemapSourceJPEG = new XYZ({
				url: this.webview.convertFileSrc(this.file.externalDataDirectory + 'offline_tiles/{z}/{x}/{y}.jpeg')
			});
			this.offlineBasemapSourcePNG = new XYZ({
				url: this.webview.convertFileSrc(this.file.externalDataDirectory + 'offline_tiles/{z}/{x}/{y}.png')
			});
		}

		this.exportFeaturesSubscription = this.datashare.exportFeaturesObservable().subscribe(element => {
			// Get array of features
			let pointsToExport = this.vectorPoint.getSource().getFeatures();
			let pathsToExport = this.pathsLayer.getSource().getFeatures();

			let featuresToExport: Feature[] = []
			
			featuresToExport = pointsToExport.concat(pathsToExport);

			this.featureService.exportFeatures(pointsToExport, this.projectId, element);
		});
	}

	changeFeatureVisibility() {
		this.changeFeatureVisibilitySubscription = this.datashare.changeFeatureVisibilityObservable().subscribe(data => {
			if (data.checkedStatus === true) {
				// Active layer visibility if ios not setted yet
				this.map.getLayers().forEach((layer) => {
					let layerx = layer as VectorLayer;
					let source = layerx.getSource();
					if (source instanceof VectorSource) {
						let features = source.getFeatures();
						if (features.length > 0) {
							//let found = features.some(data.feature);
							let found = features.some(feature => feature['ol_uid'] === data.feature['ol_uid']);
							if (found) {
								layer.setVisible(true);
							}
						}
					}
				});
				data.feature.setStyle(data.feature_style); // To show this feature again

			} else {
				data.feature.setStyle(new Style({})); // To hide feature
			}
		});
	}

	/** Get user coordinates as an array: [long, lat] */
	getCurrentCoordinates(): Promise<number[]> {
		return this.ionGeolocation.getCurrentPosition().then((resp) => {
			this.longitude = resp.coords.longitude;
			this.latitude = resp.coords.latitude;
			let coordinates: number[] = fromLonLat([resp.coords.longitude, resp.coords.latitude]); //Transforms a coordinate from longitude/latitude to a different projection.

			return coordinates;
		});
	}

	/** Load map in the right coordinates */
	loadMap(): Promise<void> {
		return this.loadingController.create({
			message: 'Aguarde enquanto carregamos o mapa para você.'
		}).then(loading => {
			loading.present();
			return this.storageService.fetch('project', this.projectId).then(project => {
				this.projectCenter = fromLonLat([this.longitude, this.latitude]); //Transforms a coordinate from longitude/latitude to a different projection.

				//Define view location
				this.view = new View({
					center: this.projectCenter,
					rotation: Math.PI / 6,
					zoom: project.zoom
				});

				if (this.networkService.getCurrentNetworkStatus() == ConnectionStatus.Online) {
					this.storageService.fetch('project', this.projectId).then(project => {
						if (project.map === "OSM") {
							this.tileBackground.setSource(new OSM());
						} else if (project.map === "BingMaps") {
							let tileSource = new BingMaps({
								key: this.datashare.BING_KEY,
								imagerySet: 'Aerial',
								// use maxZoom 19 to see stretched tiles instead of the BingMaps
								// "no photos at this zoom level" tiles
								maxZoom: 19
							});
							this.tileBackground.setSource(tileSource);
						} else if (project.map === 'offline_basemap') {
							this.storageService.fetchAll('offline_basemap').then(data => {
								if (data['extension'].includes('jpeg')) {
									this.tileBackground.setSource(this.offlineBasemapSourceJPEG);
									this.datashare.getCurrentMap('offline_basemap');
								} else if (data['extension'].includes('png')) {
									this.tileBackground.setSource(this.offlineBasemapSourcePNG);
									this.datashare.getCurrentMap('offline_basemap');
								}
							});
						}
					});
				} else {
					this.loadOfflineBaseMap();
				}

				// map creation
				this.map = new Map({
					layers: [
						this.tileBackground,
						this.vectorPoint,
						this.geolayer,
						this.pathsLayer
					],
					target: 'map',
					view: this.view,
				});

				//map bug fix
				setTimeout(() => {
					this.map.updateSize();
				}, 500);

				this.map.on("pointermove", evt => {
					if (evt.dragging) {
						this.deactivateTrackButton();
					}
				});
				loading.dismiss();
			});
		});
	}

	deactivateTrackButton(): void {
		this.mapHasChanged = true; // Update map movement status
		this.datashare.gpsButtonStatus(false);
	}

	/** Enable click after load map */
	enableClick(): void {
		// Create overlay to anchor the popup
		this.overlay = new Overlay({
			element: this.container.nativeElement
		});

		this.map.addOverlay(this.overlay);
		/* Tooltips and Feature select Configuration */
		//	When click on map, run a function
		this.map.on('click', evt => {
			evt.stopPropagation();
			let feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
				if (feature.getId() !== 'accTrackingPoint' && feature.getId() !== 'trackingPoint') {
					return feature;
				}
			},
				{ hitTolerance: this.hit_tolerance }
			);

			// Return if feature is undefined (click in map)
			if (feature === undefined) {
				return this.overlay.setPosition(undefined);
			}

			// Don't trigger for clusters points
			if (feature.get('features') !== undefined && feature.getGeometry().getType() === "Point") {
				return;
			}

			//	If there is a feature where it was clicked, run a function
			if (feature) {
				let coordinate = evt.coordinate;
				this.feature = feature as Feature;

				// Get list of properties from feature
				let id = feature.getId() as string;
				let numberId = parseInt(id);

				this.storageService.fetch('features', numberId).then(data => {
					let message: string;
					let name: string = data.name ? data.name : data.id;
					if (data.images.length === 0 || data.images === undefined) {
						message = '<div class="icon"><ion-icon name="images-outline" style="font-size: 20px; float:left; position: relative; top: 10px;"></ion-icon> <span style="float: left; position: relative; left: -6px; top: -18px; background: lightgrey; padding: 0 5px; border-radius: 10px;">0</span></div><ion-label>' + name + '</ion-label>'
					} else {
						message = '<div class="icon"><div style="height: 25px; width: 25px; left: 7%; position: absolute; bottom: 22%; background-image: url(' + Capacitor.convertFileSrc(data.images[0]) + '); border-radius: 10%; background-size: cover; background-repeat: no-repeat;"></div><span style="float: left; position: relative; left: -6px; top: -6px; background: lightgrey; padding: 0 5px; border-radius: 10px;">' + data.images.length + '</span></div><ion-label>' + name + '</ion-label>'
					}
					this.content.nativeElement.innerHTML = message;
					this.overlay.setPosition(coordinate);
				});
			}

			this.map.on("pointermove", evt => {
				if (evt.dragging) {
					this.overlay.setPosition(undefined);
				}
			});
		});

		this.turnGpsOnStart();
	}

	/**  Fly Animation 
	*  FLYTO IS ACCEPTING COORDINATES IM  EPSG 3857
	*/
	flyTo(location: number[]) {
		var duration = 2000;
		var zoom = this.view.getZoom();
		var parts = 2;
		var called = false;
		function callback(complete) {
			--parts;
			if (called) {
				return;
			}
			if (parts === 0 || !complete) {
				called = true;
			}
		}
		this.view.animate({
			center: location,
			duration: duration
		}, callback);

		this.view.animate(
			{
				zoom: zoom - 3,
				duration: duration / 2,
			},
			{
				zoom: zoom + 2,
				duration: duration / 2,
			}, callback);
	}

	initGPS() {

		/* -- GEOLOCATION -- */
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
					color: '#3399CCff'
				}),
				stroke: new Stroke({
					color: '#fff',
					width: 2
				})
			})
		}));

		this.positionFeature.setId("trackingPoint");

		this.geolayer = new VectorLayer({
			map: this.map,
			source: new VectorSource({
				features: [this.accuracyFeature, this.positionFeature]
			}),
			visible: true
		});
	}

	loadOfflineBaseMap() {
		//creating a tile layer to receive the offline map
		let tileBackground = new TileLayer({
			className: 'tileBackground'
		});

		// New TileLayer, loading the OSM map. It will be used for background
		// If user is connect, load OSM. If user is not connected, check for offline source
		if (this.networkService.getCurrentNetworkStatus() == ConnectionStatus.Online) {
			tileBackground.setSource(new OSM());
			this.datashare.changeObservableStringValue('currentBasemapObservable', 'Aerial');
			this.datashare.currentBasemap = 'Aerial';

		} else {
			// Turn off tile date info
			this.tileDateIsDisabled = true;

			this.storage.get('offline_basemap').then((data) => {
				if (data) {
					data = JSON.parse(data);
					if (data.status === true) {
						if (data.extension.includes('png')) {
							tileBackground.setSource(this.offlineBasemapSourcePNG);
							this.datashare.changeObservableStringValue('currentBasemapObservable', 'offline_basemap');
							this.datashare.currentBasemap = 'offline_basemap';
							this.map.addLayer(tileBackground);
						}
					}
				}
			});
		}
	}

	downloadBasemap(): Promise<void> {
		// Check if there is another map in storage
		return this.storage.get('basemapPerimeter').then(_ => {
			this.uiService.presentAlertConfirm('Atenção!', 'A função irá baixar um mapa da área da tela para utilização offline, dependendo do tamanho da área a função pode demorar, deseja prosseguir?').then(res => {
				if (res) {
					// Get view zoom
					let zoom = this.map.getView().getZoom();

					if (zoom >= 10) {
						// Loop for each tile, in each zoom level
						if (zoom < 12) {
							return this.uiService.presentAlertConfirm('Atenção!', 'Seu zoom está muito baixo, será baixado uma parcela muito maior do seu mapa você tem certeza?').then(res => {
								if (res) {
									return this.saveBasemapInStorage(zoom).then(_ => {
										return this.storageService.fetchAll('offline_basemap').then(data => {
											this.uiService.presentToast('Download do mapa concluído. Para acessá-lo clique no menu ferramentas e mude a opção do mapa de fundo para mapa offline!', 5000);
											/** reutilizável */
											// if (data['extension'].includes('jpeg')) {
											// 	this.clearTileCache();
											// 	setTimeout(_ => {
											// 		this.tileBackground.setSource(this.offlineBasemapSourceJPEG);
											// 		this.datashare.getCurrentMap('offline_basemap');
											// 	}, 2000);
											// } else if (data['extension'].includes('png')) {
											// 	this.clearTileCache();
											// 	setTimeout(_ => {
											// 		this.tileBackground.setSource(this.offlineBasemapSourcePNG);
											// 		this.datashare.getCurrentMap('offline_basemap');
											// 	}, 2000);
											// }
										});
									});
								}
							});
						} else {
							return this.saveBasemapInStorage(zoom).then(_ => {
								return this.storageService.fetchAll('offline_basemap').then(data => {
									this.uiService.presentToast('Download do mapa concluído. Para acessá-lo clique no menu ferramentas e mude a opção do mapa de fundo para mapa offline!', 5000);
									/** reutilizável */
									// if (data['extension'].includes('jpeg')) {
									// 	this.clearTileCache();
									// 	setTimeout(_ => {
									// 		this.tileBackground.setSource(this.offlineBasemapSourceJPEG);
									// 		this.datashare.getCurrentMap('offline_basemap');
									// 	}, 2000);
									// } else if (data['extension'].includes('png')) {
									// 	this.clearTileCache();
									// 	setTimeout(_ => {
									// 		this.tileBackground.setSource(this.offlineBasemapSourcePNG);
									// 		this.datashare.getCurrentMap('offline_basemap');
									// 	}, 2000);
									// }
								});
							});
						}
					} else {
						this.uiService.presentAlertConfirm('Atenção!', 'Zoom muito baixo, não é possível completar o download por causa da quantidade de arquivos.');
					}
				}
			});
		});
	}

	saveBasemapInStorage(zoom: number): Promise<void> {
		let urls: Object[] = []
		let extensionType: string //extensionType is the .png for the images

		let tileSource = this.tileBackground.getSource() as OSM | BingMaps;
		let tileUrlFunction = tileSource.getTileUrlFunction();

		// Get view extent
		let extent = this.map.getView().calculateExtent();

		// Update downloaded map location feature
		this.updateDownMapPerimeter(extent);

		if (zoom < 17) {
			for (let i = Math.round(zoom); i <= 17; i++) {
				tileSource.tileGrid.forEachTileCoord(extent, i, tileCoord => {
					let url = tileUrlFunction(tileCoord, 1, olProj.get('EPSG:3857'));
					if (extensionType === undefined || extensionType === null) {
						extensionType = url.split('.').pop();
					}
					let newEntry = {
						tileCoord: tileCoord,
						url: url
					};
					urls.push(newEntry);
				});
			}

		} else {
			tileSource.tileGrid.forEachTileCoord(extent, 17, tileCoord => {
				let url = tileUrlFunction(tileCoord, 1, olProj.get('EPSG:3857'));
				if (extensionType === undefined || extensionType === null) {
					extensionType = url.split('.').pop();
				}
				let newEntry = {
					tileCoord: tileCoord,
					url: url
				};
				urls.push(newEntry);
			});
		}

		return this.layersService.saveBasemapInStorage(urls).then(_ => {
			this.offlineBasemapRangeStatus = false;

			// Change status in datashare
			this.datashare.changeObservableStatus('offlineBasemapObservable', true);

			// Save in localStorage
			let data = {
				status: true,
				extension: extensionType
			}
			return this.storage.set('offline_basemap', JSON.stringify(data));

		});
	}

	updateDownMapPerimeter(extent: number[]): Promise<void> {
		let feature = new Feature();
		let polyCoords: number[][];

		this.basemapPerimeter.getSource().clear(); // clear source of layer

		// Get geometry from extent
		let bottomLeft = getBottomLeft(extent as Extent);
		let bottomRight = getBottomRight(extent as Extent);
		let topLeft = getTopLeft(extent as Extent);
		let topRight = getTopRight(extent as Extent);

		polyCoords = [bottomLeft, bottomRight, topRight, topLeft, bottomLeft];

		feature.setGeometry(new Polygon([polyCoords]));// create feature
		this.basemapPerimeter.getSource().addFeature(feature);// add feature to source

		return this.storage.set('basemapPerimeter', JSON.stringify(polyCoords));
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
				this.uiService.presentToast("Ocorreu algum erro ao tentar obter a localização: " + error);
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

	checkGpsPermission(): Promise<void> {
		return this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
			result => {
				if (result.hasPermission) {
					// If GPS not activated yet, ask to turn on
					return this.diagnostic.isGpsLocationAvailable().then(success => {

						if (success === true) {
							return; // Already activated

						} else {
							// Show 'Turn On GPS' dialogue
							return this.askToTurnOnGPS();
						}

					}, error => {
						this.uiService.presentToast("Ocorreu algum erro ao tentar obter a localização: " + error);

					});
				} else {
					//If not having permission ask for permission
					return this.requestGPSPermission();
				}
			}, err => {
				alert(err.message);
			}
		);
	}

	/** Fly to user location */
	activateGPS(): Promise<void> {
		this.mapHasChanged = false;

		// Active device's GPS if not activated yet
		return this.diagnostic.isGpsLocationAvailable().then(success => {
			// If we got permission
			if (success) {
				this.geolocation.on('change', () => {
					if (this.mapHasChanged === false) {
						this.view.setCenter(transform(this.geolocation.getPosition(), 'EPSG:4326', 'EPSG:3857'));
					}
				});

				this.datashare.changeObservableStatus('gpsButtonObservable', true);

			} else {
				this.uiService.presentToast("Não foi possível detectar o GPS do dispositivo, verifique se está ativado!");

				return;
			}
		}, error => {
			this.uiService.presentToast("Ocorreu algum erro ao tentar obter a localização: " + error);

			return;
		});
	}

	deactivateGPS() {
		this.gpsFunction = false; // set status of button local variable to false
		this.geolayer.getSource().clear(); // Clear accuracy and position feature in geolayer
		this.geolocation.setTracking(false); // Deactivate OL GPS tracking
		this.datashare.changeImageOfButton('locationButton'); // Change button in /map
		this.datashare.gpsButtonStatus(false);
	}

	requestGPSPermission(): Promise<void> {
		return this.locationAccuracy.canRequest().then(canRequest => {
			if (canRequest) {
			} else {
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
		return this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(_ => {
			return;
		},
			error => {
				if (error.code === 3) {
					// Impossible to obtain location, disable GPS button  					
					// this.datashare.changeObservableStatus('gpsFunctionObservable', false);
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

	changeOfflineBasemapRangeStatus() {
		this.offlineBasemapRangeStatus = !this.offlineBasemapRangeStatus;
	}

	//path code start
	loadPaths(): Promise<void> {
		return this.storage.get('paths').then(paths => {
			if (paths) {
				let parsedPaths: PathObj[] = JSON.parse(paths);
				let promises = [];

				// Get paths where projectId match
				let projectPaths = parsedPaths.filter((path) => {
					return path.projectId == this.projectId;
				});

				for (let prop = projectPaths.length - 1, j = Promise.resolve(); prop >= 0; prop--) {
					promises.push(this.loadPath(projectPaths[prop]));
				}

				return Promise.all(promises).then((results) => {
					// Update pathLayerSubject in datashare
					this.datashare.updatePathLayer(this.pathsLayer);
				});
			}
		});
	}

	loadPath(path: PathObj): Promise<void> {
		return new Promise((resolve) => {
			// Add paths to layer
			let newFeature = new Feature({
				projectId: path.projectId,
				userUid: path.userUid,
				name: path.name,
				id: path.id,
				start_date: path.start_date,
				end_date: path.end_date,
				style: path.feature_style
			})
			let pathGeometry = new LineString(path.coordinates)
			newFeature.setGeometry(pathGeometry);
			this.pathsLayer.getSource().addFeature(newFeature);
			resolve();
		});
	}

	createLinePath() {
		this.uiService.presentAlertConfirm('Atenção!', 'Gravação de trajeto iniciada. Para parar de gravar clique no botão novamente!');
		this.activateGPS();

		this.startDate = this.generalService.stringToDate(this.generalService.getDate());

		this.featureLine = new Feature({
			name: 'Meu caminho',
			id: new Date().valueOf(),
			start_date: this.startDate,
			end_date: '',
			geometry: new LineString([])
		});

		this.pathsLayer.getSource().addFeature(this.featureLine);
		let lastCoordinates;
		this.watchPathSubscription = this.ionGeolocation.watchPosition().subscribe(data => {
			let position = [data['coords']['longitude'], data['coords']['latitude']];
			let coordinates = transform(position, 'EPSG:4326', 'EPSG:3857');

			if (lastCoordinates === undefined || lastCoordinates.length === 0 || coordinates[0] !== lastCoordinates[0] || coordinates[1] !== lastCoordinates[1]) {
				// Update lastCoordinate
				lastCoordinates = coordinates;
				// Add coordinate in Linestring
				if (this.featureLine.getGeometry() === null || this.featureLine.getGeometry() === undefined) {
					// First time, create LineString
					this.featureLine.setGeometry(new LineString([coordinates]));

				} else {
					let geometry = this.featureLine.getGeometry() as LineString;

					// Get current coordinates of LineString
					let toChangeCoord = geometry.getCoordinates();
					// Push new coordinates to LineString
					toChangeCoord.push([coordinates[0], coordinates[1]]);
					let newGeometry = new LineString(toChangeCoord);
					this.featureLine.setGeometry(newGeometry);
				}
			}
		});
	}

	endLinePath() {
		this.uiService.presentAlertConfirm('Atenção!', 'Gravação de trajeto finalizada')

		// Stop tracking geolocation position
		this.watchPathSubscription.unsubscribe();
		this.deactivateTrackButton();

		// Add end time to feature
		let end_date = this.generalService.stringToDate(this.generalService.getDate());
		this.featureLine.setProperties({ 'end_date': end_date });

		let geometry = this.featureLine.getGeometry() as LineString;

		let pathObj: PathObj = {
			projectId: this.projectId,
			userUid: this.uid,
			name: 'Meu caminho',
			id: new Date().valueOf(),
			start_date: this.startDate,
			end_date: end_date,
			coordinates: geometry.getCoordinates(),
			feature_style: this.featureLine.getStyle() as Style
		}

		// Save path in storage
		this.storage.get('paths').then(paths => {
			if (paths && paths !== undefined && paths !== '') {
				// Edit existent data
				let pathsArray: PathObj[] = JSON.parse(paths);
				pathsArray.push(pathObj)

				this.storage.set('paths', JSON.stringify(pathsArray)).then(() => {
					this.featureLine = null; // Return data to null
				});

			} else {
				// First time saving
				let pathsArray: PathObj[] = [pathObj];
				this.storage.set('paths', JSON.stringify(pathsArray)).then(() => {
					this.featureLine = null; // Return data to null
				});
			}
		});
	}

	/** Load selected layer */
	loadLayer(layer: Layer | LayerBrowser, loadMap: boolean = false): void {
		if (this.platform.is('cordova')) {
			this.checkFileInDeviceStorage(layer).then(result => {
				layer = layer as Layer;
				if (result) {
					this.readFileInDeviceStorage(layer.path).then(fileAsText => {
						this.checkLayer(fileAsText, layer.name, layer.id, loadMap);
					});
				} else {
					this.uiService.presentToast("Não existe arquivo neste diretório: <br>" + layer.path);
				}
			});
		} else {
			layer = layer as LayerBrowser;
			if (layer) {
				this.checkLayer(layer.data, layer.name, layer.id, loadMap);
			}
		}
	}

	/** Check if file exists in device storage  */
	checkFileInDeviceStorage(layer): Promise<boolean> {
		let filepath = layer.path.substring(0, layer.path.lastIndexOf('/') + 1);
		let filename = layer.path.split('/').pop();
		return this.file.checkFile(filepath, filename).then((result) => {
			return result;
		}).catch(e => {
			return false;
		})
	}

	/** Read a file in storage device and return a file as string */
	readFileInDeviceStorage(path: string): Promise<string> {
		return Filesystem.readFile({
			path: path,
		}).then(fileAs64 => {
			let fileAsText: string = atob(fileAs64.data);
			return fileAsText;
		});
	}

	/** Create layer in map */
	checkLayer(fileAsText: string, name: string, id: number, loadMap: boolean = false): void {
		let found: boolean = false;
		this.map.getLayers().forEach(layer => {
			let layerId = layer.get('id');
			let layerName: string = layer.get('name');
			if (layerId === id && layerName === name) {
				this.toggleLayer(id, name, loadMap);
				found = true;
			}
		});
		if (!found) {
			let infoChange: any[] = []
			if (this.platform.is('cordova')) {
				this.storageService.fetch('layers', id).then(layer => {
					let layerArray: Layer = {
						id: layer.id,
						projectId: layer.projectId,
						name: layer.name,
						path: layer.path,
						date: layer.date,
						visibility: layer.visibility = loadMap ? loadMap : !layer.visibility
					}
					infoChange.push(layerArray);
					this.storageService.update('layers', id, infoChange).then(_ => {
						this.createLayer(id, name, fileAsText);
					});
				});
			} else {
				this.storageService.fetch('layersBrowser', id).then(layer => {
					let layerArray: LayerBrowser = {
						id: layer.id,
						projectId: layer.projectId,
						name: layer.name,
						data: layer.data,
						date: layer.date,
						visibility: layer.visibility = loadMap ? loadMap : !layer.visibility
					}
					infoChange.push(layerArray);
					this.storageService.update('layersBrowser', id, infoChange).then(_ => {
						this.createLayer(id, name, fileAsText);
					});
				});
			}
		}
	}

	/** Load layers on load map */
	loadLayers(): void {
		if (this.platform.is('cordova')) {
			this.storageService.fetchByAnotherValue('layers', this.projectId, 'projectId').then(data => {
				if (data !== null) {
					for (let i = 0; i < data.length; i++) {
						if (data[i]['visibility']) {
							this.loadLayer(data[i], true);
						}
					}
				}
			});
		} else {
			this.storageService.fetchByAnotherValue('layersBrowser', this.projectId, 'projectId').then(data => {
				if (data !== null) {
					for (let i = 0; i < data.length; i++) {
						if (data[i]['visibility']) {
							this.loadLayer(data[i], true);
						}
					}
				}
			});
		}
	}

	/** Create layer in map */
	createLayer(id: number, name: string, fileAsText: string) {
		let newVectorSource = new VectorSource({})
		let newVectorLayer = new VectorLayer({
			source: newVectorSource,
			zIndex: 55,
			visible: true
		});
		newVectorLayer.set('name', name);
		newVectorLayer.set('id', id);

		let format = new KML({});

		newVectorSource.addFeatures(format.readFeatures(fileAsText, {
			featureProjection: 'EPSG:3857',
			dataProjection: 'EPSG:4326'
		}));

		this.map.addLayer(newVectorLayer);
	}

	/** Check the visibility of layer and show or hide him */
	toggleLayer(id: number, name: string, loadMap: boolean): void {
		this.map.getLayers().forEach(layer => {
			let nameLayer: string = layer.get('name');
			let idLayer: number = layer.get('id');
			let infoChange: any[] = [];
			if (id === idLayer && name === nameLayer) {
				if (this.platform.is('cordova')) {
					this.storageService.fetch('layers', id).then(layerStorage => {
						layer.setVisible(!layerStorage.visibility);
						let layerArray: Layer = {
							id: layerStorage.id,
							projectId: layerStorage.projectId,
							name: layerStorage.name,
							path: layerStorage.path,
							date: layerStorage.date,
							visibility: layerStorage.visibility = loadMap ? loadMap : !layerStorage.visibility
						}
						infoChange.push(layerArray);
						this.storageService.update('layers', id, infoChange);
					});
				} else {
					this.storageService.fetch('layersBrowser', id).then(layerStorage => {
						layer.setVisible(!layerStorage.visibility);
						let layerArray: LayerBrowser = {
							id: layerStorage.id,
							projectId: layerStorage.projectId,
							name: layerStorage.name,
							data: layerStorage.data,
							date: layerStorage.date,
							visibility: layerStorage.visibility = loadMap ? loadMap : !layerStorage.visibility
						}
						infoChange.push(layerArray);
						this.storageService.update('layersBrowser', id, infoChange);
					});
				}
			}
		});
	}

	/** Create point in the position */
	createPointInPosition(position: number[], gps: boolean = false): Promise<Feature> {
		// Get highest feature id
		let hid: number;
		return this.storageService.makeNewId('features').then(id => {
			hid = id;

			// Active layer
			this.map.getLayers().forEach(layer => {
				if (layer.get('name') === 'vectorPoint') {
					layer.setVisible(true);
				}
			});

			// Create the point
			let newFeature: Feature = new Feature;

			if (gps === true) {
				let features = this.vectorPoint.getSource().getFeatures();
				for (let i = 0; i < features.length; i++) {
					if (features[i]['values_']['isGps']) {
						return features[i];
					}
				}
				newFeature.setStyle(new Style({
					image: new CircleStyle({
						radius: 6,
						fill: new Fill({
							color: '#00fff2ff'
						}),
						stroke: new Stroke({
							color: '#fff',
							width: 2
						})
					})
				}));
				this.pointType = true;

			} else {
				newFeature.setStyle(new Style({
					image: new Icon({
						src: 'assets/map-icons/wht-pushpin.png',
						anchor: [0.22, 55],
						anchorXUnits: 'fraction' as IconAnchorUnits,
						anchorYUnits: 'pixels' as IconAnchorUnits,
						color: '#32ff32ff',
						size: [100, 100],
						scale: 0.5
					})
				}));
				this.pointType = false;
			}

			// Set attributes
			newFeature.setId(hid);
			newFeature.setGeometry(new Point(position));
			this.vectorPoint.getSource().addFeature(newFeature);
			return newFeature;
		});
	}

	openEditFeature(feature: Feature): void {
		// Get data from current point feature
		let id = feature['id_'];
		let coord = this.featureService.getFeatureCoordinates(feature);
		let type = feature.getGeometry().getType();
		let style = feature.getStyle();
		let pointType = this.pointType;
		this.storageService.fetch('features', id).then(data => {
			this.modalController.create({
				component: ModalEditFeaturesPage,
				componentProps: {
					featureId: id,
					projectId: this.projectId,
					coord: coord,
					type: type,
					style: style,
					check: data ? data.check : false,
					isGps: pointType
				}
			}).then(modal => {
				modal.onDidDismiss().then(data => {
					feature.setStyle(data.data.style);
					let { style, images, ...dataX } = data.data;
					feature.setProperties(dataX);
					let propertyValue: FeatureProperty = {};
					data.data.properties.forEach(property => {
						propertyValue[property.name] = property.value;
					});
					feature.setProperties(propertyValue);

					this.datashare.newPointAdd();
				}).catch(_ => {
					console.log('canceled');
				});
				modal.present();
			}).catch(e => {
				console.log(e);
			});
		});
	}

	/** delete feature from map */
	removeFeatureFromMap(id): void {
		let feature = this.vectorPoint.getSource().getFeatureById(id);
		let source = this.vectorPoint.getSource();
		source.removeFeature(feature);
		this.overlay.setPosition(undefined);
	}

	checkFeatureState(): void {
		this.storageService.fetchByAnotherValue('features', this.projectId, 'projectId').then(features => {
			if (features !== null) {
				this.loadingController.create({
					message: 'Aguarde enquanto as features são carregadas...'
				}).then(loading => {
					loading.present();
					for (let i = 0; i < features.length; i++) {
						if (features[i]['check']) {
							let id = features[i]['id'];
							this.loadFeature(id);
						}
					}
					loading.dismiss();
				});
			}
		});
	}

	/** Toggle all points in the map */
	toggleAllPoints(): Promise<void> {
		let points: Feature[] = this.vectorPoint.getSource().getFeatures();
		return Promise.all(points.map(point => {
			this.loadFeature(point['values_']['id']);
		})).then(_ => {
			return;
		});
	}

	/** Search by feature */
	loadFeature(id): Promise<void> {
		return this.storageService.fetch('features', id).then(data => {
			let features = this.vectorPoint.getSource().getFeatures();
			if (features.length <= 0 && data.check === true) {
				this.createFeature(data, data.type);
			} else if (features.length > 0) {
				let found = features.some(feature => feature['id_'] === data.id);
				if (found) {
					this.toggleFeature(data.id)
				} else {
					if (data.check) {
						this.createFeature(data, data.type);
					}
				}
			}
		});
	}

	/** Toggle Feature */
	toggleFeature(id: number): void {
		let feature = this.vectorPoint.getSource().getFeatureById(id);
		this.storageService.fetch('features', id).then(data => {
			if (data.check) {
				this.map.getLayers().forEach(layer => {
					let layerx = layer as VectorLayer;
					let source = layerx.getSource();
					if (source instanceof VectorSource) {
						let features = source.getFeatures();
						if (features.length > 0) {
							let found = features.some(feature => feature['id_'] === data.id);
							if (found) {
								layerx.setVisible(true);
							}
						}
					}
				});
				let style;

				if (data.style['image_']['color_']) {
					style = new Style({
						image: new Icon({
							src: 'assets/map-icons/wht-pushpin.png',
							anchor: [0.22, 55],
							anchorXUnits: 'fraction' as IconAnchorUnits,
							anchorYUnits: 'pixels' as IconAnchorUnits,
							color: data.style['image_']['color_'],
							size: [100, 100],
							scale: 0.5
						})
					});
				} else {
					style = new Style({
						image: new CircleStyle({
							radius: 6,
							fill: new Fill({
								color: data.style['image_']['fill_']['color_']
							})
						})
					});
				}
				feature.setStyle(style) // To show this feature again
			} else {
				feature.setStyle(new Style({})); // To hide feature
			}
		});
	}

	/** Create Feature */
	createFeature(feature: UserFeature, geometry: string): void {
		let id = feature.id;
		let position = feature.coordinates;
		// Active layer
		this.map.getLayers().forEach(layer => {
			if (layer.get('name') === 'vectorPoint') {
				layer.setVisible(true);
			}
		});

		// Create the point
		let newFeature: Feature = new Feature;

		// Set attributes
		if (geometry === 'Point') {
			newFeature.setId(id);
			newFeature.setGeometry(new Point(position));
			if (feature.style['image_']['color_']) {
				newFeature.setStyle(new Style({
					image: new Icon({
						src: 'assets/map-icons/wht-pushpin.png',
						anchor: [0.22, 55],
						anchorXUnits: 'fraction' as IconAnchorUnits,
						anchorYUnits: 'pixels' as IconAnchorUnits,
						color: feature.style['image_']['color_'],
						size: [100, 100],
						scale: 0.5
					})
				}));
			} else {
				newFeature.setStyle(new Style({
					image: new CircleStyle({
						radius: 6,
						fill: new Fill({
							color: feature.style['image_']['fill_']['color_']
						})
					})
				}));
			}
			let featureValues = {
				name: feature.name,
				description: feature.description,
				id: feature.id,
				projectId: feature.projectId
			}
			newFeature.setProperties(featureValues);
			let propertyValue: FeatureProperty = {};
			feature.properties.forEach(property => {
				propertyValue[property.name] = property.value;
			});
			newFeature.setProperties(propertyValue);
			this.vectorPoint.getSource().addFeature(newFeature);
		} else if (geometry === 'LineString') {

		} else if (geometry === 'Polygon') {

		} else {
			this.uiService.presentToast("Geometry não suportada");
		}
	}

	/** Change map background */
	changeLayer(map): void {
		let tileSource;
		if (map === 'OSM') {
			this.clearTileCache()
			tileSource = new OSM();
			this.tileBackground.setSource(tileSource);
			this.datashare.getCurrentMap('OSM');
		}
		if (map === 'BingMaps') {
			this.clearTileCache()
			tileSource = new BingMaps({
				key: this.datashare.BING_KEY,
				imagerySet: 'Aerial',
				// use maxZoom 19 to see stretched tiles instead of the BingMaps
				// "no photos at this zoom level" tiles
				maxZoom: 19
			});
			this.tileBackground.setSource(tileSource);
			this.datashare.getCurrentMap('BingMaps');
		}
		if (map === 'offline_basemap') {
			this.storageService.fetchAll('offline_basemap').then(data => {
				if (data['extension'].includes('jpeg')) {
					this.clearTileCache()
					this.tileBackground.setSource(this.offlineBasemapSourceJPEG);
					this.datashare.getCurrentMap('offline_basemap');
				} else if (data['extension'].includes('png')) {
					this.clearTileCache()
					this.tileBackground.setSource(this.offlineBasemapSourcePNG);
					this.datashare.getCurrentMap('offline_basemap');
				}
			});
		}
	}

	/** Clear the tile cache */
	clearTileCache(): void {
		let source = this.tileBackground.getSource();
		source.tileCache.expireCache({});
		source.tileCache.clear();
		source.refresh();
	}

	ngOnDestroy() {
		this.goToCoordinateSubscription.unsubscribe();
		this.setCoordinateSubscription.unsubscribe();
		this.activeLayerSubscription.unsubscribe();
		this.targetPointSubscription.unsubscribe();
		this.deleteFeatureFromMapSubscription.unsubscribe();
		this.activeFeatureSubscription.unsubscribe();
		this.pathSubscription.unsubscribe();
		this.changeFeatureVisibilitySubscription.unsubscribe();
		this.selectLayerBackgroundSubscription.unsubscribe();
		this.exportFeaturesSubscription.unsubscribe();
		this.toggleAllPointsSubscription.unsubscribe();
		this.gpsPointSubscription.unsubscribe();
	}
}

interface FeatureProperty {
	[key: string]: string | number;
}