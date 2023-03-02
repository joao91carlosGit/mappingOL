import { TestBed } from '@angular/core/testing';

import { LayersServiceService } from './layers-service.service';

describe('LayersServiceService', () => {
  let service: LayersServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayersServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
