import { Component, Input, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, ViewportScroller, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LoginComponent } from '../../features/auth/login/login.component';
import { AuthService } from '../../core/services/auth.service';
import { ForgotPasswordComponent } from '../../features/auth/forgotpassword/forgot-password.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type Item = { label?: string; link: string; exact?: boolean; icon?: 'user'|'gear'|'report'; aria?: string; };
export type NavItem = Item;

@Component({
  standalone: true,
  selector: 'app-nav',
  imports: [CommonModule, RouterModule, LoginComponent, ForgotPasswordComponent],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {
  constructor(
    private auth: AuthService,
    private router: Router,
    private viewportScroller: ViewportScroller,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.auth.isAuthenticated$.pipe(takeUntilDestroyed()).subscribe(v => this.isAuthenticated = v);
  }

  private get isBrowser() { return isPlatformBrowser(this.platformId); }

  @Input() brand = 'FitPass';
  @Input() items: Item[] | null = null;
  @Input() actions: Item[] | null = null;

  readonly defaultItems: Item[] = [
    { label: 'Inicio',    link: '/', exact: true },
    { label: 'Servicios', link: '/#servicios' },
    { label: 'Membresías', link: '/#membresias' },
    { label: 'Clases',    link: '/#clases' },
  ];

  readonly defaultActions: Item[] = [
    { label: 'Login', link: '/login', icon: 'user',  aria: 'Iniciar sesión' }
  ];

  open = signal(false);
  profileMenuOpen = signal(false);

  toggle(){ this.open.update(v => !v); }
  toggleProfileMenu(){ this.profileMenuOpen.update(v => !v); }
  closeProfileMenu(){ this.profileMenuOpen.set(false); }

  get itemsToShow(){ return (this.items?.length ? this.items : this.defaultItems); }
  get actionsToShow(){ return (this.actions?.length ? this.actions : this.defaultActions); }

  isAuthenticated = false;

  ngOnInit(){
    // Estado instantáneo actual; luego se actualiza por el observable en el ctor
    this.isAuthenticated = this.auth.isAuthenticated;
  }

  modal: 'login' | 'forgot' | 'register' | null = null;
  openLogin(){ this.modal = 'login'; }
  openForgot(){ this.modal = 'forgot'; }
  openRegister(){ this.modal = 'register'; }
  closeModal(){ this.modal = null; }

  logout() {
    this.auth.logout();
    this.open.set(false);
    this.router.navigate(['/']);
  }

  /** Logo: ir al Home y recargar la pantalla */
  onBrandClick(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!this.isBrowser) return;

    if (this.router.url === '/') {
      window.location.reload();
    } else {
      this.router.navigateByUrl('/', { replaceUrl: true }).then(() => window.location.reload());
    }
  }

  /** Click en item del menú principal */
  onItemClick(it: Item, ev: Event) {
    // Inicio: navegar (si es necesario) y hacer scroll al top
    if (it.link === '/') {
      this.onHomeClick(ev);
      return;
    }
    // Ancla dentro del home
    if (it.link.startsWith('/#')) {
      this.scrollToSection(it.link, ev);
      return;
    }
    // Para el resto, deja que routerLink haga su trabajo
  }

  /** Ir a Home y hacer scroll (sin reload) */
  onHomeClick(ev?: Event) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }

    const doScrollTop = () => {
      if (!this.isBrowser) return;
      setTimeout(() => this.viewportScroller.scrollToPosition([0, 0]), 0);
      this.open.set(false);
    };

    if (this.router.url === '/') {
      doScrollTop();
    } else {
      this.router.navigateByUrl('/', { replaceUrl: false }).then(doScrollTop);
    }
  }

  scrollToSection(link: string, event?: Event) {
    if (event) event.preventDefault();

    if (link === '/') {
      this.onHomeClick();
      return;
    }

    if (link.startsWith('/#')) {
      const sectionId = link.substring(2);

      if (this.router.url !== '/') {
        this.router.navigate(['/']).then(() => {
          setTimeout(() => this.scrollToElement(sectionId), 100);
        });
      } else {
        this.scrollToElement(sectionId);
      }
      this.open.set(false);
    }
  }

  private scrollToElement(elementId: string) {
    if (!this.isBrowser) return;
    const element = document.getElementById(elementId);
    if (element) {
      const yOffset = -80; // compensa header fijo
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }
}
