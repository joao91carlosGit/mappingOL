import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActionSheetController, Platform, ModalController, LoadingController } from '@ionic/angular';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { Capacitor } from '@capacitor/core';

import Style from 'ol/style/Style';

import { StorageService } from '../../services/storage-service.service';
import { UicontrollersService } from '../../services/uicontrollers.service';
import { UserFeature, featureProperty, LastColors } from '../../services/interfaces.service';
import { FilesystemService } from '../../services/filesystem.service';
import { DatashareService } from '../../services/datashare.service';
import { GeneralService } from '../../services/general.service';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Icon from 'ol/style/Icon';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';

@Component({
	selector: 'app-modal-edit-features',
	templateUrl: './modal-edit-features.page.html',
	styleUrls: ['./modal-edit-features.page.scss'],
})
export class ModalEditFeaturesPage implements OnInit {

	@Input() featureId: number;
	@Input() projectId: number;
	@Input() coord: number[];
	@Input() type: string;
	@Input() style: Style;
	@Input() check: boolean;
	@Input() isGps: boolean;
	@ViewChild('hiddenFileInput') hiddenFileInput: ElementRef;

	public name: string;
	public description: string;
	public featuresInfo: UserFeature[] = [];
	public properties: featureProperty[] = [];
	public lastColors: LastColors[] = [];
	public addImages: string[] = [];
	public color: string;
	public userSelect: string = 'img';
	public buttonStatus: boolean = false;
	private allImagesPath: string[] = [];
	private newImagesPath: string[] = [];

	constructor(
		private storageService: StorageService,
		private camera: Camera,
		private photoViewer: PhotoViewer,
		private platform: Platform,
		private actionSheetController: ActionSheetController,
		private filesystemService: FilesystemService,
		private filePath: FilePath,
		private modalController: ModalController,
		private datashare: DatashareService,
		private uiService: UicontrollersService,
		private generalService: GeneralService,
		private loading: LoadingController
	) { }

	ngOnInit() {
		if (this.style['image_']['fill_']) {
			this.color = this.style['image_']['fill_'].color_;
			this.userSelect = 'point';
		} else {
			let color = this.generalService.convertRgbInHex(this.style['image_'].color_[0], this.style['image_'].color_[1], this.style['image_'].color_[2], this.style['image_'].color_[3]);
			this.color = color;
			this.userSelect = 'img';
		}
		this.searchByFeaturesInfo();
		this.searchPropertiesInFeatures();
		this.searchByLastColors();
	}

	/** Click on button add photo */
	addPhoto(): void {
		if (this.platform.is('cordova')) {
			this.selectImage();
		} else {
			// Click in the browser
			this.hiddenFileInput.nativeElement.click();
		}
	}

	/** Open the action sheet */
	selectImage(): Promise<void> {
		return this.actionSheetController.create({
			header: "Selecione a fonte da imagem",
			buttons: [{
				text: 'Carregar da galeria',
				handler: () => {
					this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
				}
			},
			{
				text: "Usar a câmera",
				handler: () => {
					this.takePicture(this.camera.PictureSourceType.CAMERA);
				}
			},
			{
				text: "Cancelar",
				role: 'cancel'
			}]
		}).then(action => {
			action.present();
		});
	}

	/** Config a picture and return his path */
	takePicture(sourceType: PictureSourceType): void {
		let options: CameraOptions = {
			quality: 100,
			sourceType: sourceType,
			saveToPhotoAlbum: false,
			correctOrientation: true
		}

		this.camera.getPicture(options).then(path => {
			if (this.platform.is('cordova') && sourceType === this.camera.PictureSourceType.PHOTOLIBRARY) {
				this.filePath.resolveNativePath(path).then(filePath => {
					this.addImages.push(Capacitor.convertFileSrc(filePath));
					this.newImagesPath.push(filePath);
				});
			} else {
				let currentName = path.substr(path.lastIndexOf('/') + 1);
				let correctPath = path.substr(0, path.lastIndexOf('/') + 1);
				this.addImages.push(Capacitor.convertFileSrc(correctPath + currentName));
				this.newImagesPath.push(correctPath + currentName);
			}
		})
	}

	/** Search by features info */
	searchByFeaturesInfo(): void {
		this.storageService.fetch('features', this.featureId).then(data => {
			if (data !== null && data !== undefined) {
				this.name = data.name;
				this.description = data.description;
				this.featuresInfo = data.features;
				this.allImagesPath = data.images;
				if (data.style.image_.fill_) {
					this.color = data.style.image_.fill_.color_;
				} else {
					this.color = this.generalService.convertRgbInHex(data.style.image_.color_[0], data.style.image_.color_[1], data.style.image_.color_[2], data.style.image_.color_[3])
				}
				for (let i = 0; i < this.allImagesPath.length; i++) {
					this.addImages.push(Capacitor.convertFileSrc(this.allImagesPath[i]));
				}
			}
		}).catch(_ => { });
	}

	/** Clone ion-item properties */
	addProperties() {
		let id = this.getHighestFeatureId();
		let newProperty: featureProperty;
		for (let i = 0; i <= this.properties.length; i++) {
			newProperty = {
				id: id,
				idFeature: this.featureId,
				name: '',
				value: ''
			};
		}
		this.properties.push(newProperty);
	}

	/** get highest feature id if exists */
	getHighestFeatureId(): number {
		let id: number;
		if (this.properties.length > 0) {
			let hid: number = Math.max.apply(Math, this.properties.map((value) => {
				return value['id'];
			}));
			id = hid + 1;
		} else {
			id = 1;
		}
		return id;
	}

	/** Save the data of feature in storage */
	saveFeature(): Promise<void> {
		return this.loading.create({
			message: 'Salvando Feature'
		}).then(loading => {
			loading.present();
			if (this.properties[0]) {

				for (let i = 0; i < this.properties.length; i++) {

					if (this.properties[i].name === '' || this.properties[i].name === undefined || this.properties[i].name === null) {
						let text = 'Preencha o nome da propriedade adicionada';
						this.uiService.presentToast(text);
						loading.dismiss();
						return;
					}

					if (this.properties[i].value === '' || this.properties[i].value === undefined || this.properties[i].value === null) {
						let text = 'Preencha o valor da propriedade adicionada';
						this.uiService.presentToast(text);
						loading.dismiss();
						return;
					}

				}

			}

			let style;

			if (this.userSelect === 'point') {
				style = new Style({
					image: new CircleStyle({
						radius: 6,
						fill: new Fill({
							color: this.color
						})
					})
				});
			} else {
				style = new Style({
					image: new Icon({
						src: 'assets/map-icons/wht-pushpin.png',
						anchor: [0.22, 55],
						anchorXUnits: 'fraction' as IconAnchorUnits,
						anchorYUnits: 'pixels' as IconAnchorUnits,
						color: this.color,
						size: [100, 100],
						scale: 0.5
					})
				})
			}

			return this.saveImages(this.newImagesPath).then(_ => {
				return this.saveLastColors().then(_ => {
					let feature: UserFeature = {
						id: this.featureId,
						projectId: this.projectId,
						check: this.check ? this.check : true,
						name: this.name,
						description: this.description,
						images: this.allImagesPath,
						type: this.type,
						properties: this.properties,
						coordinates: this.coord,
						style: style,
						isGps: this.isGps
					}

					return this.storageService.fetchAll('features').then(info => {
						if (info !== null) {
							let found: boolean = false;
							let featureChange: any[] = [];
							for (let i = 0; i < info.length; i++) {
								if (info[i]['id'] === this.featureId) {
									featureChange.push(feature);
									found = true;
								}
							}
							if (found) {
								return this.storageService.update('features', this.featureId, featureChange).then(_ => {
									this.searchByFeaturesInfo();
									this.searchByLastColors();
									loading.dismiss();
									this.modalController.dismiss(feature);
								});
							} else {
								return this.storageService.insert('features', feature).then(_ => {
									this.searchByFeaturesInfo();
									this.searchByLastColors();
									loading.dismiss();
									this.modalController.dismiss(feature);
								});
							}
						} else {
							this.storageService.insert('features', feature).then(_ => {
								this.searchByFeaturesInfo();
								this.searchByLastColors();
								loading.dismiss();
								this.modalController.dismiss(feature);
							});
						}
					});
				}).catch(_ => {
					loading.dismiss();
				});
			}).catch(_ => {
				loading.dismiss();
			});
		});
	}

	/** Search by all paths in the array and save */
	saveImages(images: string[]): Promise<string | string[]> {
		let path: string = 'SFMapp/projetos/' + this.projectId + '/pontos/' + this.featureId + '/';
		return this.filesystemService.checkAndCreateDir(path).then(_ => {
			return Promise.all(images.map(image => {
				let imageName = image.split('/').pop();
				imageName = this.filesystemService.validateNameFile(imageName);
				return this.filesystemService.readAndSave(image, path, imageName).then(result => {
					this.allImagesPath.push(result)
					return result;
				});
			}));
		});
	}

	/** Close the modal */
	closeModal(featureId: number): void {
		this.storageService.fetch('features', featureId).then(result => {
			if (!result) {
				this.datashare.deleteFeatureFromMap(this.featureId);
				this.modalController.dismiss();
			} else {
				this.modalController.dismiss();
			}
		})
	}

	/** Delete feature if exists */
	deleteFeature(): void {
		this.storageService.fetch('features', this.featureId).then(feature => {
			if (feature) {
				let path: string = 'SFMapp/projetos/' + this.projectId + '/pontos/' + this.featureId;
				this.filesystemService.checkAndDeleteDir(path).then(_ => {
					this.storageService.deleteData('features', this.featureId).then(_ => {
						this.uiService.presentToast('Feature deletada com sucesso').then(_ => {
							this.datashare.deleteFeatureFromMap(this.featureId);
							this.searchByFeaturesInfo();
							this.modalController.dismiss();
						});
					});
				});
			} else {
				this.uiService.presentToast('Esta feature não pode ser deletada, pois não existe');
			}
		});
	}

	/** Search the properties into features */
	searchPropertiesInFeatures(): void {
		this.storageService.fetch('features', this.featureId).then(data => {
			if (data !== undefined) {
				let properties = data.properties;
				for (let i = 0; i < properties.length; i++) {
					if (properties[i].idFeature === this.featureId) {
						let property: featureProperty = {
							id: properties[i].id,
							idFeature: properties[i].idFeature,
							name: properties[i].name,
							value: properties[i].value
						}
						this.properties.push(property);
					}
				}
			}
		})
	}

	/** Open the foto */
	showImage(photo): void {
		let name: string = photo.split('/').pop();
		for (let i = 0; i < this.allImagesPath.length; i++) {
			let namePath = this.allImagesPath[i].split('/').pop();
			if (name === namePath) {
				this.photoViewer.show(this.allImagesPath[i], name, { share: true });
				break;
			}
		}
	}

	/** Open dialog confirm to remove image */
	removeImage(photo): Promise<void> {
		let name: string = photo.split('/').pop();
		let namePath: string;
		let i: number;
		let found: boolean = false;

		for (i = 0; i < this.newImagesPath.length; i++) {
			namePath = this.newImagesPath[i].split('/').pop();
			if (name === namePath) {
				this.newImagesPath.splice(i, 1);
			}
		}

		for (i = 0; i < this.allImagesPath.length; i++) {
			namePath = this.allImagesPath[i].split('/').pop();
			if (name === namePath) {
				found = true;
				break;
			}
		}
		if (found) {
			return this.uiService.presentAlertConfirm('ATENÇÃO!', 'Você irá remover esta imagem do seu projeto. Tem certeza disso?').then(confirm => {
				if (confirm) {
					return this.storageService.fetch('features', this.featureId).then(feature => {
						if (feature !== undefined) {
							let imageToDelete = this.allImagesPath[i];
							this.allImagesPath.splice(i, 1)
							let data: UserFeature = {
								id: this.featureId,
								projectId: this.projectId,
								check: feature.check === undefined ? true : feature.check,
								name: feature.name,
								description: feature.description,
								images: this.allImagesPath,
								type: feature.type,
								properties: feature.properties,
								coordinates: feature.coordinates,
								style: feature.style,
								isGps: feature.isGps
							}
							let featureChange: any[] = [];
							featureChange.push(data);
							return this.storageService.update('features', this.featureId, featureChange).then(_ => {
								return this.filesystemService.checkAndDeleteFile(imageToDelete).then(_ => {
									this.addImages.splice(i, 1);
									this.uiService.presentToast("Imagem deletada com sucesso!");
								});
							});
						} else {
							this.addImages.splice(i, 1);
							this.allImagesPath.splice(i, 1);
						}
					});
				}
			});
		} else {
			this.uiService.presentToast('Não foi possível remover a imagem do dispositivo');
		}
	}

	/** Verify if id is odd or pair */
	isOdd(number: number): boolean {
		if (number % 2 !== 0) {
			return true
		} else {
			return false
		}
	}

	deleteProperty(index: number): void {
		this.properties.splice(index, 1);
		if (this.properties.length === 0) {
			this.buttonStatus = false;
		}
	}

	checkNamesOfProperties(name: string): void {
		if (this.properties.filter(obj => { return obj.name === name }).length > 1) {
			this.uiService.presentToast('Não é possível ter duas propriedades com o mesmo nome.', 2500,);
			this.buttonStatus = true;
		}
	}

	/** Save the last colors in storage */
	saveLastColors(): Promise<string> {
		let colorExists: boolean = false;
		return Promise.all(this.lastColors.map(color => {
			if (this.color === color.color) {
				colorExists = true;
				return '';
			}
		})).then(_ => {
			if (!colorExists) {
				let lastColor: LastColors = {
					projectId: this.projectId,
					color: this.color,
					select: 'false'
				}
				if (this.lastColors.length === 6) {
					this.lastColors.splice(0, 1);
					this.lastColors.push(lastColor);
					this.storageService.updateKeyValues('lastColors', this.lastColors);
				} else {
					return this.storageService.insert('lastColors', lastColor);
				}
			}
		})
	}

	/** Search by last colors in project */
	searchByLastColors(): Promise<void> {
		return this.storageService.fetchByAnotherValue('lastColors', this.projectId, 'projectId').then(colors => {
			if (colors !== 0) {
				this.lastColors = colors;
			}
		});
	}

	/** Check the color select by user */
	checkSelectColor(colorBg: string): Promise<void> {
		this.color = colorBg;
		let verifyColor: boolean = this.lastColors.some(color => color.select === 'true');
		if (verifyColor) {
			return this.storageService.fetchByAnotherValue('lastColors', 'true', 'select').then(color => {
				let infoChange: LastColors[] = [];
				let newColor: LastColors = {
					projectId: color[0].projectId,
					color: color[0].color,
					select: 'false'
				}
				infoChange.push(newColor);
				return this.storageService.updateByAnotherValue('lastColors', color[0].color, infoChange, 'color').then(_ => {
					return this.searchByLastColors().then(_ => {
						return this.storageService.fetchByAnotherValue('lastColors', colorBg, 'color').then(color => {
							let infoChange: LastColors[] = [];
							let newColor: LastColors = {
								projectId: color[0].projectId,
								color: color[0].color,
								select: 'true'
							}
							infoChange.push(newColor);
							return this.storageService.updateByAnotherValue('lastColors', color[0].color, infoChange, 'color').then(_ => {
								return this.searchByLastColors();
							});
						});
					});
				});
			});
		} else {
			return this.storageService.fetchByAnotherValue('lastColors', colorBg, 'color').then(color => {
				let infoChange: LastColors[] = [];
				let newColor: LastColors = {
					projectId: color[0].projectId,
					color: color[0].color,
					select: 'true'
				}
				infoChange.push(newColor);
				return this.storageService.updateByAnotherValue('lastColors', color[0].color, infoChange, 'color').then(_ => {
					return this.searchByLastColors();
				});
			});
		}
	}

	/** Verify if have last colors selected and change the state to false */
	verifyLastColors(): Promise<void> {
		let verifyColor: boolean = this.lastColors.some(color => color.select === 'true');
		if (verifyColor) {
			return this.storageService.fetchByAnotherValue('lastColors', 'true', 'select').then(color => {
				let infoChange: LastColors[] = [];
				let newColor: LastColors = {
					projectId: color[0].projectId,
					color: color[0].color,
					select: 'false'
				}
				infoChange.push(newColor);
				return this.storageService.updateByAnotherValue('lastColors', color[0].color, infoChange, 'color').then(_ => {
					return this.searchByLastColors();
				});
			});
		}
	}
}