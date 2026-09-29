import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MemberService } from '../../services/member.service';

interface Member {
  Id?: any;
  "Member Id"?: string;
  Name?: string;
  Relation?: string;
  ParentId?: string;
  Gender?: string;
}

interface CoupleNode {
  familyId: string;
  husband?: Member;
  wife?: Member;
  children: CoupleNode[];
}

@Component({
  selector: 'app-get-familty-tree',
  templateUrl: './get-familty-tree.component.html',
  styleUrl: './get-familty-tree.component.scss'
})
export class GetFamiltyTreeComponent implements OnInit, AfterViewInit {
  allMembers: Member[] = [];
  roots: CoupleNode[] = [];
  filteredRoots: CoupleNode[] = [];
  isLoading = true;
  searchQuery = '';

  constructor(
    private memberService: MemberService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchMembers();
  }

  fetchMembers(): void {
    this.isLoading = true;
    this.memberService.getMemberMaster().subscribe({
      next: (data: any) => {
        this.allMembers = data || [];
        this.buildTree();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching members:', err);
        this.isLoading = false;
      }
    });
  }

  buildTree(): void {
    const nodesMap: { [key: string]: CoupleNode } = {};
    const families: { [key: string]: Member[] } = {};

    // 1. Group by MemberId to find obvious couples
    this.allMembers.forEach(m => {
      const familyId = m["Member Id"];
      if (familyId) {
        if (!families[familyId]) families[familyId] = [];
        families[familyId].push(m);
      }
    });

    const processedIds = new Set<string>();

    // 2. Identify couples and create nodes
    Object.keys(families).forEach(familyId => {
      const members = families[familyId];
      const husband = members.find(m => m.Relation?.toLowerCase() === 'self') || members.find(m => m.Gender?.toLowerCase() === 'male');
      const wife = members.find(m => m.Relation?.toLowerCase() === 'wife') || members.find(m => m.Gender?.toLowerCase() === 'female' && m !== husband);

      if (husband) {
        const id = husband.Id?.toString();
        nodesMap[id] = { familyId, husband, wife, children: [] };
        processedIds.add(id);
        if (wife) processedIds.add(wife.Id?.toString());
      }
    });

    // Create unique nodes for single people
    this.allMembers.forEach(m => {
      const id = m.Id?.toString();
      if (!processedIds.has(id)) {
        nodesMap[id] = { familyId: m["Member Id"] || 'N/A', husband: m, children: [] };
      }
    });

    // 3. Link them using ParentId
    const roots: CoupleNode[] = [];
    const childrenIds = new Set<string>();

    Object.keys(nodesMap).forEach(id => {
      const node = nodesMap[id];
      const pId = node.husband?.ParentId;

      if (pId && pId !== '0' && nodesMap[pId]) {
        nodesMap[pId].children.push(node);
        childrenIds.add(id);
      } else if (pId && pId !== '0') {
         // Cross-family link (parentId to memberId)
         let linked = false;
         for (const fid in nodesMap) {
           if (nodesMap[fid].familyId === pId) {
             nodesMap[fid].children.push(node);
             childrenIds.add(id);
             linked = true;
             break;
           }
         }
         if (!linked) roots.push(node);
      } else {
        roots.push(node);
      }
    });

    this.roots = roots.filter(r => !childrenIds.has(r.husband?.Id?.toString() || ''));
    this.filterTree();
  }

  filterTree(): void {
    if (!this.searchQuery) {
      this.filteredRoots = this.roots;
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredRoots = this.roots.filter(root => this.treeContains(root, query));
  }

  treeContains(node: CoupleNode, query: string): boolean {
    if (node.familyId.toLowerCase().includes(query)) return true;
    if (node.husband?.["Member Id"]?.toLowerCase().includes(query)) return true;
    if (node.wife?.["Member Id"]?.toLowerCase().includes(query)) return true;
    // Names as fallback
    if (node.husband?.Name?.toLowerCase().includes(query)) return true;
    if (node.wife?.Name?.toLowerCase().includes(query)) return true;
    
    return node.children.some(child => this.treeContains(child, query));
  }

  ngAfterViewInit() {
    this.centerScroll();
  }

  centerScroll() {
    const container = document.getElementById('container');
    if (container) {
      setTimeout(() => {
        container.scrollTo({
          top: 0,
          left: (container.scrollWidth - container.clientWidth) / 2,
          behavior: 'smooth'
        });
      }, 500);
    }
  }

  onSignout() {
    localStorage.removeItem('session-timeout');
    this.router.navigate(['/']);
  }
}
