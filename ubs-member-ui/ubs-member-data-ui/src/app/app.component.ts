import { Component } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false,
})
export class AppComponent {
  title = 'WebApp';
  showMenu = true;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    const updateMenuVisibility = () => {
      let route = this.activatedRoute;
      while (route.firstChild) {
        route = route.firstChild;
      }
      const hideMenu = route.snapshot.data?.['hideMenu'] === true;
      this.showMenu = !hideMenu;
    };

    updateMenuVisibility();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        updateMenuVisibility();
      });
  }
}
