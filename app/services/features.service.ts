import { Injectable } from '@angular/core';

import { LoadingController, Platform } from '@ionic/angular';

import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { File } from '@ionic-native/file/ngx';

import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import { transform } from 'ol/proj.js';
import KML from 'ol/format/KML';

import * as JSZIP from 'jszip/dist/jszip.js';

import { Coordinate } from './interfaces.service';
import { UicontrollersService } from './uicontrollers.service';
import { GeneralService } from './general.service';
import { StorageService } from './storage-service.service';
import { FilesystemService } from './filesystem.service';
import { UserFeature } from './interfaces.service';

@Injectable({
	providedIn: 'root'
})
export class FeaturesService {

	private mainDoc: string;
	private features: Feature[];
	private featuresStorage: UserFeature[] = [];
	private projectId: number;
	private zip: JSZIP;
	private finalFilePathKmz: string;

	constructor(
		private loadingController: LoadingController,
		private uicontrollers: UicontrollersService,
		private generalService: GeneralService,
		private platform: Platform,
		private socialSharing: SocialSharing,
		private storageService: StorageService,
		private filesystemService: FilesystemService,
		private file: File,
	) { }

	getFeatureCoordinates(feature: Feature): Coordinate[][][] | Coordinate[][] | Coordinate[] | Coordinate {
		let type = feature.getGeometry().getType();

		if (type === 'Polygon') {
			let polygon: Polygon = feature.getGeometry() as Polygon;
			return polygon.getCoordinates();

		} else if (type === 'LineString') {
			let lineString = feature.getGeometry() as LineString;
			return lineString.getCoordinates();

		} else if (type === 'Point') {
			let point = feature.getGeometry() as Point;
			return point.getCoordinates();

		} else if (type === 'MultiPolygon') {
			let multiPolygon = feature.getGeometry() as MultiPolygon;
			return multiPolygon.getCoordinates();
		}
	}

	setFeatureCoordinates(feature: Feature, coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]): void {
		let type = feature.getGeometry().getType();

		if (type === 'Polygon') {
			let intoCoordinates = coordinates as Coordinate[][];
			let polygon: Polygon = feature.getGeometry() as Polygon;
			return polygon.setCoordinates(intoCoordinates);

		} else if (type === 'LineString') {
			let intoCoordinates = coordinates as Coordinate[];
			let lineString = feature.getGeometry() as LineString;
			return lineString.setCoordinates(intoCoordinates);

		} else if (type === 'Point') {
			let point = feature.getGeometry() as Point;
			return point.setCoordinates(coordinates);

		} else if (type === 'MultiPolygon') {
			let intoCoordinates = coordinates as Coordinate[][][];
			let multiPolygon = feature.getGeometry() as MultiPolygon;
			return multiPolygon.setCoordinates(intoCoordinates);
		}
	}

	exportFeatures(features: Feature[], projectId: number, element): void {
		this.zip = new JSZIP();
		this.features = features;
		this.loadingController.create({
			message: 'Exportando dados...'
		}).then(loading => {
			loading.present();

			// Check features
			if (features.length < 1) {
				this.uicontrollers.presentToast('Não há nada para exportar');
				loading.dismiss();
			} else {
				return this.storageService.fetchAll('features').then(featuresStorage => {
					this.featuresStorage = featuresStorage;
					for (let feature of features) {
						let coordinates = this.getFeatureCoordinates(feature) as Coordinate;
						let convertedCoordinates = transform(coordinates, 'EPSG:3857', 'EPSG:4326');
						this.setFeatureCoordinates(feature, convertedCoordinates);
					}

					let kml_format = new KML();
					let kmlFile = kml_format.writeFeatures(features);

					for (let feature of features) {
						let coordinates = this.getFeatureCoordinates(feature) as Coordinate;
						let convertedCoordinates = transform(coordinates, 'EPSG:4326', 'EPSG:3857');
						this.setFeatureCoordinates(feature, convertedCoordinates);
					}

					if (!kmlFile.includes('<Document>')) {
						let placemark = kmlFile.indexOf('<Placemark ');
						let output = [
							kmlFile.slice(0, placemark),
							'<Document>',
							kmlFile.slice(placemark)
						].join('');

						placemark = output.indexOf('</Placemark>') + 12;
						output = [
							output.slice(0, placemark),
							'</Document>',
							output.slice(placemark)
						].join('');
						kmlFile = output;
					}

					// Add styles
					let finalOutput = this.editDoc(kmlFile, features);
					this.mainDoc = finalOutput;
					this.features = features;
					this.projectId = projectId;
					let createPath: string = 'SFMapp/projetos/' + this.projectId + '/export_features/';
					return this.filesystemService.checkAndCreateDir(createPath).then(res => {
						if (res) {
							return this.handleZipAndSave(element).then(_ => {
								loading.dismiss();
								if (this.platform.is('cordova')) {
									return this.uicontrollers.presentAlertConfirm('Download concluído', 'Deseja compartilhar o arquivo?', 'Compartilhar').then(confirm => {
										if (confirm) {
											return this.shareGeneratedFile(this.finalFilePathKmz).then(_ => {
												return this.uicontrollers.presentToast('Arquivo salvo na pasta SFMapp no dispositivo');
											});
										} else {
											return this.uicontrollers.presentToast('Arquivo salvo na pasta SFMapp no dispositivo');
										}
									});
								} else {
									this.uicontrollers.presentToast('Arquivo gerado com sucesso!');
								}
							});
						}
					});
				});
			}
		});
	}

	/** Edit or remove a value between two indexes and returns the edited file. */
	editFile(text: string, index1: number, index2: number, newValue: string): string {
		let output = [
			text.slice(0, index1), // Start of prop
			newValue, // Add/replace value in middle
			text.slice(index2) // Merge the rest
		].join('');
		return output;
	}

	/** Edit a doc to kml format and returns the kml file */
	editDoc(kmlFile: string, features: Feature[]): string {
		let i: number = 0
		for (let feature of features) {
			let id: number = feature['id_'];
			let color: string;
			if (feature['style_']['image_']['color_']) {
				let r: number = feature['style_']['image_']['color_'][0];
				let g: number = feature['style_']['image_']['color_'][1];
				let b: number = feature['style_']['image_']['color_'][2];
				let a: number = feature['style_']['image_']['color_'][3];
				color = this.generalService.convertRgbInHex(r, g, b, a);
			} else {
				color = feature['style_']['image_']['fill_']['color_']
			}

			color = this.generalService.invertHex(color);
			color = color.replace('#', '');

			let colorElements: string = '<Style id="sfmapp_style_' + id + '"><IconStyle><color>' + color + '</color><Icon><href>http://maps.google.com/mapfiles/kml/pushpin/wht-pushpin.png</href></Icon><hotSpot x="20" y="2" xunits="pixels" yunits="pixels"/></IconStyle></Style>';

			// add styles
			let document: number = kmlFile.indexOf('Document');
			let closingDocument: number = kmlFile.indexOf('>', document) + 1;
			kmlFile = [
				kmlFile.slice(0, closingDocument),
				colorElements,
				kmlFile.slice(closingDocument)
			].join('');

			// Removing wrong tag
			let index1: number = kmlFile.indexOf('<Style/>');
			let index2: number = index1 + 8;

			if (index1 !== -1) {
				kmlFile = this.editFile(kmlFile, index1, index2, '');
			}

			// Add reference to style element
			let placemark: number = kmlFile.indexOf('Placemark id="' + id + '"');
			let closingPlacemark: number = kmlFile.indexOf('>', placemark) + 1;
			kmlFile = [
				kmlFile.slice(0, closingPlacemark),
				'<styleUrl>#sfmapp_style_' + id + '</styleUrl>',
				kmlFile.slice(closingPlacemark)
			].join('');
			i++;
		}
		return kmlFile;
	}

	handleZipAndSave(element): Promise<void> {
		let kmzName: string;
		return this.storageService.fetch('project', this.projectId).then(project => {
			kmzName = 'geometrias_' + project.project;
			if (this.platform.is('cordova')) {
				return this.zipAllImages().then(_ => {
					let newDoc: string = this.verifyNameIcons(this.mainDoc);
					newDoc = this.removeIdFromFile(newDoc);
					newDoc = this.removeProjectIdFromFile(newDoc);
					this.zip.file(kmzName + '.kml', newDoc);
					let path: string = this.file.externalRootDirectory + 'SFMapp/projetos/' + this.projectId + '/export_features/';
					return this.zip.generateAsync({ type: "arraybuffer" }).then(content => {
						return this.filesystemService.checkAndDeleteFile(path + kmzName + '.kmz').then(_ => {
							return this.file.writeFile(path, kmzName + '.kmz', content).then(res => {
								if (res) {
									let finalFilePath = path + kmzName + '.kmz';
									this.finalFilePathKmz = finalFilePath;
									return;
								} else {
									this.uicontrollers.presentToast('Erro ao salvar o arquivo');
									return;
								}
							});
						});
					});
				});
				// in Browser
			} else {
				let newDoc: string = this.verifyNameIcons(this.mainDoc);
				newDoc = this.removeIdFromFile(newDoc);
				newDoc = this.removeProjectIdFromFile(newDoc);
				element.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(newDoc));
				element.setAttribute('download', kmzName + '.kml');
				element.click();
			}
		});
	}

	shareGeneratedFile(filePath: string): Promise<void> {
		return this.socialSharing.share('Novo arquivo gerado', 'Seu arquivo', filePath);
	}

	zipAllImages(): Promise<void> {
		let promises = [];
		let passedSomeImage: boolean = false;
		let images: string[] = [];

		return this.storageService.fetchAll('features').then(userFeatures => {
			userFeatures.map(userFeature => {
				let userFeatureX = userFeature as UserFeature;
				this.features.map(feature => {
					if (userFeatureX.id === feature['id_']) {
						for (let image of userFeatureX.images) {
							images.push(image);
						}
						let featureId: number = userFeatureX.id
						userFeatureX.images.map(image => {
							let imageName = image.substr(image.lastIndexOf('/') + 1);

							// If this is the first image linked to the feature, create "SchemaData" tag
							if (!passedSomeImage) {
								let placemark = this.mainDoc.indexOf('<Placemark id="' + featureId + '"');
								let extendData = this.mainDoc.indexOf('<ExtendedData>', placemark);
								let finalPlacemark = this.mainDoc.indexOf('<Placemark id="' + featureId) + 17 + featureId.toString().length;
								if (extendData === -1) {
									this.mainDoc = [
										this.mainDoc.slice(0, finalPlacemark),
										'<ExtendedData><SchemaData schemaUrl="#schema0"><SimpleData name="sfmapp_photos"><![CDATA[<img src="' + imageName + '" /><br/>]]></SimpleData></SchemaData></ExtendedData>',
										this.mainDoc.slice(finalPlacemark)
									].join('');
								} else {
									extendData = extendData + 14;
									this.mainDoc = [
										this.mainDoc.slice(0, extendData),
										'<SchemaData schemaUrl="#schema0"><SimpleData name="sfmapp_photos"><![CDATA[<img src="' + imageName + '" /><br/>]]></SimpleData></SchemaData>',
										this.mainDoc.slice(extendData)
									].join('');
								}
								passedSomeImage = true;
							} else {
								let newCDATASection = '<![CDATA[<img src="' + imageName + '" /><br/>]]>';
								let placemark = this.mainDoc.indexOf('<Placemark id="' + featureId + '"');
								let simpleData = this.mainDoc.indexOf('name="sfmapp_photos">', placemark) + 21;
								this.mainDoc = [
									this.mainDoc.slice(0, simpleData),
									newCDATASection,
									this.mainDoc.slice(simpleData)
								].join('');
							}
						});
					}

					passedSomeImage = false;
				});
			});
			for (let i = 0; i < images.length; i++) {
				if (images[i].length > 0) {
					promises.push(this.uriToBase64(images[i]).then(value => {
						this.zip.file(images[i].substr(images[i].lastIndexOf('/') + 1), value, { base64: true })
					}));
				}
			}

			return Promise.all(promises).then(_ => { return; });
		});
	}

	uriToBase64(image: string): Promise<string> {
		return this.filesystemService.readFile(image).then(file64 => {
			let fileWithoutExtension = ('' + file64 + '').replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
			return fileWithoutExtension;
		})
	}

	/** Verify reference to images and change to link to the google and returns a string */
	verifyNameIcons(doc: string): string {
		let newDoc: string = doc;
		let iconName: string = 'wht-pushpin.png'
		let regexHref = new RegExp('<href>assets/map-icons/' + iconName + '</href>', "g");
		let styleHref = regexHref.test(doc); // boolean (true = found)
		let numberOfResultsHref = (doc.match(regexHref) || []).length;
		let regexScale = new RegExp('<scale>0.5</scale>', "g");
		let styleScale = regexScale.test(doc); // boolean (true = found)
		let numberOfResultsStyle = (doc.match(regexScale) || []).length;

		if (styleHref) {
			for (let i = 0; i < numberOfResultsHref; i++) {
				newDoc = newDoc.replace('<href>assets/map-icons/' + iconName + '</href>', '<href>http://maps.google.com/mapfiles/kml/pushpin/wht-pushpin.png</href>');
			}
		}

		if (styleScale) {
			for (let i = 0; i < numberOfResultsStyle; i++) {
				newDoc = newDoc.replace('<scale>0.5</scale>', '');
			}
		}
		return newDoc;
	}

	removeIdFromFile(doc: string): string {
		let newDoc: string = doc;
		for (let feature of this.featuresStorage) {
			let regexId = new RegExp('<Data name="id"><value>' + feature.id + '</value></Data>', 'g');
			let numberOfResultsId = (newDoc.match(regexId) || []).length;
			if (regexId.test(newDoc)) {
				for (let i = 0; i < numberOfResultsId; i++) {
					newDoc = newDoc.replace('<Data name="id"><value>' + feature.id + '</value></Data>', '');
				}
			}
		}
		return newDoc;
	}

	removeProjectIdFromFile(doc: string): string {
		let newDoc: string = doc;
		for (let feature of this.featuresStorage) {
			let regexProjectId = new RegExp('<Data name="projectId"><value>' + feature.projectId + '</value></Data>', 'g');
			if (regexProjectId.test(newDoc)) {
				let numberOfResults = (newDoc.match(regexProjectId) || []).length;
				for (let i = 0; i <= numberOfResults; i++) {
					newDoc = newDoc.replace('<Data name="projectId"><value>'+ this.projectId +'</value></Data>', '');
				}
			}
		}
		return newDoc;
	}
}