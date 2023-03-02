import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Vector as VectorLayer } from 'ol/layer.js';
import Feature from 'ol/Feature';
import { Style } from 'ol/style.js'

import { StorageService } from './storage-service.service';
import { Layer, LayerBrowser, Project, MapDetails } from './interfaces.service';

@Injectable({
	providedIn: 'root'
})
export class DatashareService {

	public BING_KEY = 'AvT6yNhWlIwqv21lC88L34bDeXl125BmGS6DN4aYYMvc1pg_0TX9anISvpXkOR7r';

	private goToCoordinatesSubject = new Subject<boolean>();

	private imageButtonObservable = new Subject<string>();
	currentButtonData = this.imageButtonObservable.asObservable();

	private gpsFunctionStatusSubject = new Subject<boolean>();
	gpsFunctionStatusObservable = this.gpsFunctionStatusSubject.asObservable();
	public gpsFunctionStatus: boolean = false;

	private gpsFunctionSubject = new Subject<boolean>();
	gpsFunctionObservable = this.gpsFunctionSubject.asObservable();

	private gpsButtonSubject = new Subject<boolean>();

	private offlineBasemapSubject = new Subject<boolean>();
	offlineBasemapObservable = this.offlineBasemapSubject.asObservable();
	private currentBasemapSubject = new Subject<string>();
	currentBasemapObservable = this.currentBasemapSubject.asObservable();
	public currentBasemap: string = 'Aerial';

	private deleteFeatureFromMapSubject = new Subject<void>();
	private activeFeatureSubject = new Subject<void>();
	private targetPointSubject = new Subject<void>();
	public currentPathStatus: boolean = false;
	private pathSubject = new Subject<boolean>();
	private pathLayerSubject = new Subject<VectorLayer>();
	private selectBackgroundLayerSubject = new Subject<void>();
	private currentMapSubject = new Subject<string>();
	private exportFeaturesSubject = new Subject<void>();
	private newPointAddSubject = new Subject<void>();
	private createPointInGpsPositionSubject = new Subject<void>();
	private toggleAllPointsSubject = new Subject<HTMLIonLoadingElement>()
	private getMapDetailsSubject = new Subject<MapDetails>();

	private activeLayerSubject = new Subject<LayerBrowser | Layer>();
	private activeLayerPathSubject = new Subject<{ checked: boolean, vectorlayer: string, layerName: string }>();
	private changeTilelayersSubject = new Subject<{ tilelayer_name: string, tilelayer_uid: string, tilelayer_location: string }[]>();

	private multigeometryFeaturesSubject = new Subject<MultiGeometryFeature[]>();

	private pointLayerSubject = new Subject<boolean>();
	public currentPointLayerState: boolean = false;

	private changeFeatureVisibilitySubject = new Subject<{ feature: Feature, checkedStatus: boolean, feature_style: Style }>();

	public gpsPointSubject = new Subject<void>();
	gpsPointObservable = this.gpsPointSubject.asObservable();

	private coordinatesProjectSubject = new Subject<any[]>();

	private project: Project[] = []

	constructor(
		private storageService: StorageService
	) { }

	changeImageOfButton(buttonId: string) {
		this.imageButtonObservable.next(buttonId);
	}

	/** Change the boolean value of an Observable */
	changeObservableStatus(observable: string, state: boolean) {
		if (observable === 'offlineBasemapObservable') {
			this.offlineBasemapSubject.next(state);

		} else if (observable === 'gpsFunctionObservable') {
			this.gpsFunctionSubject.next(state);
			this.gpsFunctionStatus = state;

		} else if (observable === 'gpsButtonObservable') {
			this.gpsButtonSubject.next(state);

		} else if (observable === 'gpsFunctionStatusObservable') {
			this.gpsFunctionStatusSubject.next(state);
		}
	}

	/** Change the string value of an Observable */
	changeObservableStringValue(observable: string, string: string) {
		if (observable === 'currentBasemapObservable') {
			this.currentBasemapSubject.next(string);
		}
	}

	goToCoordinates(tracking: boolean) {
		return this.goToCoordinatesSubject.next(tracking);
	}
	goToCoordinatesObservable(): Observable<boolean> {
		return this.goToCoordinatesSubject
	}

	/** Active selected layer */
	activeLayer(layer: LayerBrowser | Layer): void {
		return this.activeLayerSubject.next(layer)
	}
	activeLayerObservable(): Observable<LayerBrowser | Layer> {
		return this.activeLayerSubject;
	}

	activeLayerPath(checked: boolean, vectorlayer: string, layerName: string): void {
		return this.activeLayerPathSubject.next({ checked, vectorlayer, layerName });
	}
	activeLayerPathObservable(): Observable<{ checked: boolean, vectorlayer: string, layerName: string }> {
		return this.activeLayerPathSubject;
	}

	changePathStatus(status: boolean): void {
		this.currentPathStatus = status;
		return this.pathSubject.next(status);
	}
	changePathObservable(): Observable<boolean> {
		return this.pathSubject;
	}

	updatePathLayer(layer: VectorLayer): void {
		return this.pathLayerSubject.next(layer);
	}
	updatePathLayerObservable(): Observable<VectorLayer> {
		return this.pathLayerSubject;
	}
	changeTilelayers(data: { tilelayer_name: string, tilelayer_uid: string, tilelayer_location: string }[]) {
		this.changeTilelayersSubject.next(data);
	}
	changeTilelayersObservable(): Observable<{ tilelayer_name: string, tilelayer_uid: string, tilelayer_location: string }[]> {
		return this.changeTilelayersSubject;
	}

	multigeometryFeaturesObservable(): Observable<MultiGeometryFeature[]> {
		return this.multigeometryFeaturesSubject;
	}

	changePointLayerState(state: boolean) {
		this.pointLayerSubject.next(state);
		this.currentPointLayerState = state;
	}

	pointLayerStateObservable(): Observable<boolean> {
		return this.pointLayerSubject;
	}

	changeFeatureVisibility(feature: Feature, checkedStatus: boolean, feature_style: Style) {
		this.changeFeatureVisibilitySubject.next({ feature, checkedStatus, feature_style })
	}
	changeFeatureVisibilityObservable(): Observable<{ feature: Feature, checkedStatus: boolean, feature_style: Style }> {
		return this.changeFeatureVisibilitySubject;
	}

	setCoordinatesProject(coordinates: any[]) {
		this.coordinatesProjectSubject.next(coordinates);
	}
	setCoordinatesProjectObservable(): Observable<any[]> {
		return this.coordinatesProjectSubject;
	}

	/** Call the observable */
	callSetCoordinatesProject() {
		let coordinates: any[] = this.project;
		this.setCoordinatesProject(coordinates);
	}

	/** Save the specific project in the variable */
	receiveDataProject(id: number) {
		this.storageService.fetch('project', id).then(project => {
			this.project = project;
			if (this.project) {
				this.callSetCoordinatesProject();
			}
		});
	}

	/** Create point from the target */
	activeTargetPoint() : void {
		return this.targetPointSubject.next();
	}
	activeTargetPointObservable(): Observable<void> {
		return this.targetPointSubject;
	}

	/** Create point from the gps position */
	createPointInGpsPosition(): void {
		return this.createPointInGpsPositionSubject.next();
	}
	createPointInGpsPositionObservable(): Observable<void> {
		return this.createPointInGpsPositionSubject;
	}

	/** Delete feature from the map */
	deleteFeatureFromMap(featureId): void {
		return this.deleteFeatureFromMapSubject.next(featureId);
	}
	deleteFeatureFromMapObservable(): Observable<void> { 
		return this.deleteFeatureFromMapSubject
	}

	/** Load feature */
	activeFeature(featureId): void {
		return this.activeFeatureSubject.next(featureId);
	}
	activeFeatureObservable(): Observable<void> {
		return this.activeFeatureSubject
	}

	/** Change Map */
	selectBackgroundLayer(map): void {
		this.selectBackgroundLayerSubject.next(map);
	}
	selectBackgroundLayerObservable(): Observable<void> {
		return this.selectBackgroundLayerSubject;
	}

	/** Get current map */
	getCurrentMap(map): void {
		this.currentMapSubject.next(map);
	}
	getCurrentMapObservable(): Observable<string> {
		return this.currentMapSubject;
	}

	/** Export layers in KML version */
	exportFeatures(downloader): void {
		this.exportFeaturesSubject.next(downloader);
	}
	exportFeaturesObservable(): Observable<void> {
		return this.exportFeaturesSubject;
	}

	/** GPS button on map */
	gpsButtonStatus(status: boolean): void {
		this.gpsButtonSubject.next(status);
	}
	gpsButtonStatusObservable(): Observable<boolean> {
		return this.gpsButtonSubject;
	}

	/** Check new features add or removed */
	newPointAdd(): void {
		this.newPointAddSubject.next();
	}
	newPointAddObservable(): Observable<void> {
		return this.newPointAddSubject;
	}

	/** Toggle all map points */
	toggleAllPoints(loading: HTMLIonLoadingElement): void {
		this.toggleAllPointsSubject.next(loading)
	}
	toggleAllPointsObservable(): Observable<HTMLIonLoadingElement> {
		return this.toggleAllPointsSubject;
	}

	/** Get zoom on the map */
	getMapDetails(details: MapDetails): void {
		this.getMapDetailsSubject.next(details);
	}
	getMapDetailsObservable(): Observable<MapDetails> {
		return this.getMapDetailsSubject;
	}
}

export interface MultiGeometryFeature {
	layer_name: string;
	layer_id: number;
	feature: Feature;
	feature_style: Style;
}
