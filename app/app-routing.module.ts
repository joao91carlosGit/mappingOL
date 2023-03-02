import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'meus-projetos',
    pathMatch: 'full'
  },
  {
    path: 'meus-projetos',
    loadChildren: () => import('./meus-projetos/meus-projetos.module').then( m => m.MeusProjetosPageModule)
  },
  {
    path: 'modal-new-project',
    loadChildren: () => import('./modals/modal-new-project/modal-new-project.module').then( m => m.ModalNewProjectPageModule)
  },
  {
    path: 'modal-new-layer',
    loadChildren: () => import('./modals/modal-new-layer/modal-new-layer.module').then( m => m.ModalNewLayerPageModule)
  },
  {
    path: 'map',
    loadChildren: () => import('./map/map.module').then( m => m.MapPageModule)
  },
  {
    path: 'modal-edit-features',
    loadChildren: () => import('./modals/modal-edit-features/modal-edit-features.module').then( m => m.ModalEditFeaturesPageModule)
  },  
  {
    path: 'modal-edit-project',
    loadChildren: () => import('./modals/modal-edit-project/modal-edit-project.module').then( m => m.ModalEditProjectPageModule)
  },  
  {
    path: 'modal-select-area',
    loadChildren: () => import('./modals/modal-select-area/modal-select-area.module').then( m => m.ModalSelectAreaPageModule)
  },
  {
    path: 'modal-remove-layers',
    loadChildren: () => import('./modals/modal-remove-layers/modal-remove-layers.module').then( m => m.ModalRemoveLayersPageModule)
  }


]

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
