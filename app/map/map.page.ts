
import { MenuController, Platform, NavController, AlertController, LoadingController } from '@ionic/angular';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DatashareService } from "../services/datashare.service";
import { UicontrollersService } from '../services/uicontrollers.service';
import { Subscription } from 'rxjs';
import { Storage } from '@ionic/storage';
import Feature from 'ol/Feature';
import { Style } from 'ol/style.js';
import { ActivatedRoute } from "@angular/router";
import { StorageService } from "../services/storage-service.service";
import { Layer, LayerBrowser, Project, UserFeature } from "../services/interfaces.service";

@Component({
	selector: 'app-map',
	templateUrl: './map.page.html',
	styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {
	@ViewChild('downloader') downloader: ElementRef;

	public layersProjectCheck: boolean = false;
	public layers: Layer[] = [];
	public layersBrowser: LayerBrowser[] = [];
	public featuresExist: boolean = false;
	public features: UserFeature[] = [];
	public checkAllPointsState: boolean = false;
	public buttonExportState: boolean = true;
	private idProject: number;
	public checkTracking: boolean = false;
	public currentPath: boolean = false;

	private leftMenuIsActivated: boolean = false;
	private pathMessage: string = 'Iniciar caminho';
	public project = {
		name: "projeto 1"
	}
	public pathLayer;
	public featureLayer: boolean = false;
	public layersCheck: boolean = false;
	private pathLayerSubscription: Subscription;
	private multigeometryFeaturesSubscription: Subscription;
	private getButtonStatusSubscription: Subscription;
	private newPointAddSubscription: Subscription;
	private groupedFeatures: {
		layer_name: string,
		layer_id: number,
		feature: Feature,
		feature_style: Style[]
	}[] = [];
	private tileLayersSubscription: Subscription;
	private tilelayers: {
		tilelayer_name: string,
		tilelayer_uid: string,
		tilelayer_location: string
	}[] = [];
	// private checkAllStatus: boolean = false;
	private offline_basemap_status: boolean = false;
	private selectButtonMenu: string = 'OSM';
	private getCurrentMapSubscription: Subscription;

	constructor(
		private datashare: DatashareService,
		private uiService: UicontrollersService,
		public navCtrl: NavController,
		private storage: Storage,
		private route: ActivatedRoute,
		private menu: MenuController,
		private storageService: StorageService,
		private navController: NavController,
		private alertController: AlertController,
		public platform: Platform,
		private loading: LoadingController
	) { }

	ngOnInit() {
		/** Get a map selected and input this value in the select button */
		this.storageService.fetchAll('project').then(projects => {
			for (let project of projects) {
				if (project['id'] === this.idProject) {
					this.selectButtonMenu = project['map'];
				}
			}
		})

		/** Get offline maps */
		this.storageService.fetchAll('offline_basemap').then(data => {
			if (data !== null && data !== undefined) {
				this.offline_basemap_status = true;
			} else {
				this.offline_basemap_status = false;
			}
		});

		/** Get current map */
		this.getCurrentMapSubscription = this.datashare.getCurrentMapObservable().subscribe(data => {
			this.selectButtonMenu = data;
		});

		/** Get a button status */
		this.getButtonStatusSubscription = this.datashare.gpsButtonStatusObservable().subscribe(data => {
			this.checkTracking = data;
		})

		// Save project id
		this.route.queryParams.subscribe(params => {
			this.idProject = params['id'];
		});
		this.datashare.receiveDataProject(this.idProject);
		this.searchByLayers();
		this.loadPoints().then(_ => {
			this.checkPointsState();
		});

		this.tileLayersSubscription = this.datashare.changeTilelayersObservable().subscribe(data => {
			this.tilelayers = data;
		});

		this.pathLayerSubscription = this.datashare.updatePathLayerObservable().subscribe(data => {
			this.pathLayer = data;
		});

		this.newPointAddSubscription = this.datashare.newPointAddObservable().subscribe(_ => {
			this.loading.create({
				message: 'Aguarde enquanto as features são carregadas...'
			}).then(loading => {
				loading.present();
				this.loadPoints().then(_ => {
					loading.dismiss();
				});
			});
		});

		// Get status of offline basemap
		this.storage.get('offline_basemap').then((data) => {
			if (data) {
				data = JSON.parse(data);
				this.offline_basemap_status = data.status;
			}
		});

		// Listen to state of current offline basemap status
		this.datashare.offlineBasemapObservable.subscribe(value => {
			this.offline_basemap_status = value;
		});

		this.multigeometryFeaturesSubscription = this.datashare.multigeometryFeaturesObservable().subscribe(data => {
			this.groupedFeatures = data.reduce((r, a) => {
				r[a.layer_name] = r[a.layer_name] || [];
				r[a.layer_name].push(a);
				return r;
			}, []);
		});

	}

	/** Search all points in project e change the var value */
	checkPointsState(): void {
		let check: boolean = false;
		let points: UserFeature[] = [] 
		this.features.map(feature => {
			if (feature.type === 'Point') {
				points.push(feature)
			}
		});
		check = points.some(point => point.check === false)
		this.checkAllPointsState = check ? false : true;
	}

	changeFeatureVisibility(feature: Feature, event: any, feature_style: Style) {
		let checkedStatus: boolean = event.detail.checked;
		this.datashare.changeFeatureVisibility(feature, checkedStatus, feature_style);
	}

	public toggleLayerVisibility(checkboxid: string, vectorlayer: string, layerName: string, event: any) {
		this.datashare.activeLayerPath(event.detail.checked, vectorlayer, layerName);
		this.changeMapLayerState(checkboxid, layerName, event.detail.checked);
	}

	changeCheckbox(checkboxid, vectorlayer, ionitemid, layerName) {
		let checkBox = document.getElementById(checkboxid) as HTMLInputElement;
		let item = document.getElementById(ionitemid);

		if (checkBox.checked == true) {
			this.changeMapLayerState(checkboxid, layerName, true);

		} else {
			this.changeMapLayerState(checkboxid, layerName, false);
		}

		// Update state of point layer
		if (vectorlayer === 'vectorPoint') {
			this.datashare.changePointLayerState(checkBox.checked);
		}
	}

	changeMapLayerState(checkboxid, layerName, status: boolean): Promise<void> {
		return this.storage.get('mapLayerState').then(mapLayerState => {
			mapLayerState = JSON.parse(mapLayerState);
			let id = checkboxid.slice(5);

			if (status === true) {
				// add to array				
				let newObj = { layerName: layerName, layerId: id }
				if (mapLayerState === null || mapLayerState === undefined) {
					mapLayerState = [];
				}

				// Check duplicate and remove before add new object
				let index = mapLayerState.map(layer => {
					return layer.layerId;
				}).indexOf(id);
				if (index !== undefined && index !== -1) {
					mapLayerState.splice(index, 1);
				}

				mapLayerState.push(newObj);
				return this.storage.set('mapLayerState', JSON.stringify(mapLayerState)).then(() => {
					return this.storage.get('mapLayerState').then(getMapLayerState => {
					});
				});

			} else {
				// remove of array
				let index = mapLayerState.map(layer => {
					return layer.layerId;
				}).indexOf(id);
				if (index !== undefined) {
					mapLayerState.splice(index, 1);
					return this.storage.set('mapLayerState', JSON.stringify(mapLayerState)).then(() => {
						return this.storage.get('mapLayerState');
					});
				}
			}
		});
	}

	goToCoordinates() {
		this.checkTracking = !this.checkTracking;
		this.datashare.goToCoordinates(this.checkTracking);
	}

	togglePath() {
		if (this.datashare.currentPathStatus === false) {
			this.datashare.changePathStatus(true);
			this.pathMessage = "Parar caminho";
			this.currentPath = !this.currentPath;
		} else {
			this.datashare.changePathStatus(false);
			this.pathMessage = "Iniciar caminho";
			this.currentPath = !this.currentPath;
		}
	}

	openLeftMenu(): void {
		this.menu.enable(true, 'layersMenu');
		this.menu.open('layersMenu');
	}

	openRightMenu(): void {
		this.menu.open('end');
	}

	/** Returns style of feature as a HEX value, for paths and other features */
	rgbaFeature(feature: Feature): string {
		if (feature.getStyle()) {
			let style = feature.getStyle() as Style;
			if (style.getStroke()) {
				return style.getStroke().getColor().toString();
			} else {
				return '#bbb';
			}

		} else {
			return '#bbb';
		}
	}

	/** Open side menu layers */
	openLayers(): void {
		this.menu.enable(true, 'layersMenu');
		this.menu.open('layersMenu');
	}

	/** Search by layers save in storage */
	searchByLayers(): Promise<void> {
		if (this.platform.is('cordova')) {
			return this.storageService.fetchByAnotherValue('layers', this.idProject, 'projectId').then(result => {
				this.layers = result;
				if (result[0] !== undefined) {
					this.layersProjectCheck = true;
				}
			});
		} else {
			return this.storageService.fetchByAnotherValue('layersBrowser', this.idProject, 'projectId').then(result => {
				this.layersBrowser = result;
				if (result[0] !== undefined) {
					this.layersProjectCheck = true;
				}
			});
		}
	}

	/** Change layer visibility on the page */
	toggleLayer(id: number): void {
		this.storageService.fetch('layers', id).then(result => {
			this.datashare.activeLayer(result);
		});
	}

	/** Change layer visibility on the page */
	toggleLayerBrowser(id: number): void {
		this.storageService.fetch('layersBrowser', id).then(result => {
			this.datashare.activeLayer(result);
		});
	}

	/** Create a point from the target */
	createPointFromTarget(): void {
		this.datashare.activeTargetPoint();
	}

	/** Create a point from the gps Position */
	createPointInGpsPosition(): void {
		this.datashare.createPointInGpsPosition();
	}

	/** Load features in storage */
	loadPoints(): Promise<void> {
		return this.storageService.fetchByAnotherValue('features', this.idProject, 'projectId').then(result => {
			this.features = result;
			let numberOfImages: number = 0;
			for (let i = 0; i < result.length; i++) {
				numberOfImages = numberOfImages + result[i].images.length;
			}
			if (numberOfImages > 30) {
				this.buttonExportState = false;
				this.uiService.presentToast('Não é possível exportar o projeto com mais de 30 imagens.');
			}
			if (result[0] !== undefined) {
				this.featuresExist = true;
			}
		});
	}

	/** Change feature visibility */
	toggleFeature(id: number): void {
		this.storageService.fetch('features', id).then(data => {
			let feature: UserFeature = {
				id: data.id,
				projectId: data.projectId,
				check: !data.check,
				name: data.name,
				description: data.description,
				images: data.images,
				type: data.type,
				properties: data.properties,
				coordinates: data.coordinates,
				style: data.style,
				isGps: data.isGps
			};
			let featureInfo: any[] = [];
			featureInfo.push(feature);
			this.storageService.update('features', id, featureInfo).then(_ => {
				this.datashare.activeFeature(id);
				this.loadPoints().then(_ => {
					this.checkPointsState();
				});
			});
		});
	}

	/** Open the alert to select map */
	openAlertSelectMap(): Promise<void> {
		if (this.offline_basemap_status) {
			return this.alertController.create({
				header: 'Selecione meu mapa!',
				inputs: [
					{
						label: 'OSM',
						type: 'radio',
						value: 'OSM',
						checked: this.selectButtonMenu === 'OSM' ? true : false
					},
					{
						label: 'BingMaps',
						type: 'radio',
						value: 'BingMaps',
						checked: this.selectButtonMenu === 'BingMaps' ? true : false
					},
					{
						label: 'Mapa Offline',
						type: 'radio',
						value: 'offline_basemap',
						checked: this.selectButtonMenu === 'offline_basemap' ? true : false
					}
				],
				buttons: [
					{
						text: 'Cancelar',
						role: 'cancel',
					},
					{
						text: 'Confirmar',
						handler: (data: string) => {
							this.updateMapProject(data);
							this.datashare.getCurrentMapObservable().subscribe(data => {
								this.selectButtonMenu = data;
							})
							this.changeMapLayer(data)
						}
					}
				]
			}).then(alert => {
				return alert.present();
			})
		} else {
			return this.alertController.create({
				header: 'Selecione meu mapa!',
				inputs: [
					{
						label: 'OSM',
						type: 'radio',
						value: 'OSM',
						checked: this.selectButtonMenu === 'OSM' ? true : false
					},
					{
						label: 'BingMaps',
						type: 'radio',
						value: 'BingMaps',
						checked: this.selectButtonMenu === 'BingMaps' ? true : false
					}
				],
				buttons: [
					{
						text: 'Cancelar',
						role: 'cancel',
					},
					{
						text: 'Confirmar',
						handler: (data: string) => {
							this.updateMapProject(data);
							this.selectButtonMenu = data;
							this.changeMapLayer(data)
						}
					}
				]
			}).then(alert => {
				return alert.present();
			})
		}
	}

	/** Update map project in storage */
	updateMapProject(map: string) {
		this.storageService.fetch('project', this.idProject).then(project => {
			let newProjectInfo: Project = {
				id: project.id,
				project: project.project,
				date: project.date,
				coordinates: project.coordinates,
				map: map,
				zoom: project.zoom
			}
			let changeInfo: any[] = [];
			changeInfo.push(newProjectInfo);
			this.storageService.update('project', this.idProject, changeInfo);
		});
	}

	/** Change Map */
	changeMapLayer(map): void {
		this.datashare.selectBackgroundLayer(map);
	}

	/** Back to meus-projetos page */
	backToHome(): void {
		this.navController.navigateBack('meus-projetos');
	}

	/** Call datashare to export features */
	exportFeatures(): void {
		this.uiService.presentAlertConfirm('Atenção', 'Deseja fazer o download de todas as suas features?').then(confirm => {
			if (confirm) {
				let downloader = this.downloader.nativeElement
				this.datashare.exportFeatures(downloader);
			}
		})
	}

	/** Active/Desative all points */
	toggleAllPoints(): Promise<void> {
		return this.loading.create({
			message: 'Aguarde enquanto buscamos os pontos do projeto...'
		}).then(loading => {
			loading.present();
			this.checkAllPointsState = !this.checkAllPointsState
			this.features = this.features.map(feature => {
				feature.check = this.checkAllPointsState;
				return feature;
			});
			return this.storageService.updateKeyValues('features', this.features).then(_ => {
				return this.datashare.toggleAllPoints(loading);
			});
		});
	}

	// Unsubscribe from Subscriptions to avoid duplicates
	ngOnDestroy() {
		this.pathLayerSubscription.unsubscribe();
		this.tileLayersSubscription.unsubscribe();
		this.multigeometryFeaturesSubscription.unsubscribe();
		this.getCurrentMapSubscription.unsubscribe();
		this.getButtonStatusSubscription.unsubscribe();
		this.newPointAddSubscription.unsubscribe();
	}

}