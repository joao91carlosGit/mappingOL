import { Component, OnInit, Input } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { StorageService } from '../../services/storage-service.service';
import { Project } from '../../services/interfaces.service';
import { ModalSelectAreaPage } from '../modal-select-area/modal-select-area.page';
import { Subscription } from 'rxjs';
import { DatashareService } from '../../services/datashare.service';
import { UicontrollersService } from '../../services/uicontrollers.service';

@Component({
    selector: 'app-modal-edit-project',
    templateUrl: './modal-edit-project.page.html',
    styleUrls: ['./modal-edit-project.page.scss'],
})
export class ModalEditProjectPage implements OnInit {
    @Input() projectId: number;
    public modalName: string;
    private modalDate: string;
    private modalCoordinates: any[];
    public projects: Project[] = [];
    private selectedArea: number[] = [];
    private zoomMap: number;
    private getMapDetailsSubscription: Subscription;
    constructor(
        public modalController: ModalController,
        private storageService: StorageService,
        public navCtrl: NavController,
        private datashare: DatashareService,
        private uicontrollers: UicontrollersService
    ) { }

    ngOnInit() {
        this.storageService.fetch("project", this.projectId).then(data => {
            this.modalName = data.project
            this.modalDate = data.date
            this.modalCoordinates = data.coordinates
        });

        /** Get the details on the map */
        this.getMapDetailsSubscription = this.datashare.getMapDetailsObservable().subscribe(details => {
            this.selectedArea = details.position;
            this.zoomMap = details.zoom;
        });
    }

    Cancel(): Promise<boolean> {
        return this.modalController.dismiss(['canceled']);
    }

    ModalSelectArea() {
        return this.modalController.create({
            component: ModalSelectAreaPage,
            componentProps: {
                'projectId': this.projectId
            }
        }).then((modal) => {
            modal.present();
            modal.onDidDismiss().then(_ => {
                this.loadProjects();
            });

        });
    }

    // Procurar pelos projetos no local storage
    loadProjects() {
        this.storageService.fetchAll('project').then((data) => {
            this.projects = data;
        });
    }

    editProject(): Promise<void> {
        return this.storageService.fetch('project', this.projectId).then(data => {
            let project: Project = {
                id: this.projectId,
                project: this.modalName,
                date: this.modalDate,
                coordinates: this.selectedArea,
                map: data.map,
                zoom: this.zoomMap
            };
            let infoChange: any[] = [];
            infoChange.push(project);
            return this.storageService.update('project', this.projectId, infoChange).then(_ => {
                this.modalController.dismiss();
                this.uicontrollers.presentToast('Nova área salva com sucesso.', 2000);
                return;
            });
        });
    }

    ngOnDestroy(): void {
        this.getMapDetailsSubscription.unsubscribe();
    }
}