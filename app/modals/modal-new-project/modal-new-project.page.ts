import { Component } from '@angular/core';

import { ModalController } from '@ionic/angular';

import { StorageService } from '../../services/storage-service.service';
import { GeneralService } from '../../services/general.service';
import { Project } from '../../services/interfaces.service';

@Component({
	selector: 'app-modal-new-project',
	templateUrl: './modal-new-project.page.html',
	styleUrls: ['./modal-new-project.page.scss'],
})
export class ModalNewProjectPage {

	public projectName: string;

	constructor(
		private modalController: ModalController,
		private storageService: StorageService,
		private generalService: GeneralService,
	) { }

	// Salva o projeto do usuário
	saveProject(): Promise<void> {
		return this.storageService.makeNewId('project').then(id => {
			let project: Project = {
				id: id,
				project: this.projectName,
				date: this.generalService.getDate(),
				coordinates: [],
				map: 'OSM',
				zoom: 15
			}

			this.storageService.insert('project', project).then(_ => {
				this.projectName = '';
				this.modalController.dismiss();
			});

		});
	}

	// Fecha o modal
	closeModal() {
		this.modalController.dismiss();
	}
}