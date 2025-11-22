import { TestBed } from '@angular/core/testing';

import { BranchManagement } from './branch-management';

describe('BranchManagement', () => {
  let service: BranchManagement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BranchManagement);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
