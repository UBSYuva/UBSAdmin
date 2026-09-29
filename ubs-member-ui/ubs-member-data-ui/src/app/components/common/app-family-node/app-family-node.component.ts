import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: '[familyTreeNode]',
  templateUrl: './app-family-node.component.html',
  styleUrl: './app-family-node.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AppFamilyNodeComponent {
  @Input() member: any;

  ngOnInit() {    
  }
}
