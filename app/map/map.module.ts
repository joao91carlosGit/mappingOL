import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MapPageRoutingModule } from './map-routing.module';
import { MapPage } from './map.page';
import { OpenlayersComponent } from '../components/openlayers/openlayers.component'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MapPageRoutingModule
  ],
  declarations: [
    MapPage,
    OpenlayersComponent]
})
export class MapPageModule { }
