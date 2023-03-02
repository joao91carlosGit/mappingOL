import { Injectable } from '@angular/core';
import { Network } from '@ionic-native/network/ngx';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastController, Platform } from '@ionic/angular';

export enum ConnectionStatus {
    Online,
    Offline
}

@Injectable({
    providedIn: 'root'
})

export class NetworkService {

    private status: BehaviorSubject<ConnectionStatus> = new BehaviorSubject(ConnectionStatus.Offline);

    constructor(private network: Network, private toastController: ToastController, private platform: Platform) {
        this.platform.ready().then(() => {
            this.initializeNetworkEvents();
            let status = this.network.type !== 'none' ? ConnectionStatus.Online : ConnectionStatus.Offline;
            this.status.next(status);
        });
    }

    public initializeNetworkEvents() {

        this.network.onDisconnect().subscribe(() => {
            if (this.status.getValue() === ConnectionStatus.Online) {
                this.updateNetworkStatus(ConnectionStatus.Offline);
            }
        });

        this.network.onConnect().subscribe(() => {
            if (this.status.getValue() === ConnectionStatus.Offline) {
                this.updateNetworkStatus(ConnectionStatus.Online);
            }
        });
    }

    private updateNetworkStatus(status: ConnectionStatus): Promise<void> {
        this.status.next(status);

        let connection = status == ConnectionStatus.Offline ? 'Offline' : 'Online';
        return this.toastController.create({
            message: `Você está agora ${connection}`,
            duration: 3000,
            position: 'bottom'
        }).then(toast => {
            return toast.present();
        })
    }

    public onNetworkChange(): Observable<ConnectionStatus> {
        return this.status.asObservable();
    }

    public getCurrentNetworkStatus(): ConnectionStatus {
        return this.status.getValue();
    }
}