import { Component, Input, signal } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
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
    private viewportScroller: ViewportScroller
  ) {
    this.auth.isAuthenticated$.pipe(takeUntilDestroyed()).subscribe(v => this.isAuthenticated = v);
  }

  @Input() brand = 'FitPass';
  @Input() items: Item[] | null = null;
  @Input() actions: Item[] | null = null;

  readonly defaultItems: Item[] = [
    { label: 'Inicio',   link: '/', exact: true },
    { label: 'Servicios', link: '/#servicios' },
    { label: 'Membresías', link: '/#membresias' },
    { label: 'Clases',   link: '/#clases' },
  ];

  readonly defaultActions: Item[] = [
    { label: 'Login', link: '/login', icon: 'user',  aria: 'Iniciar sesión' },
    { link: '/settings', icon: 'gear', aria: 'Configuración' },
    { label: 'Reportes', link: '/reports', icon: 'report', aria: 'Reportería' },
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
    // Ya no leemos 'token' a mano: dejamos que el observable de AuthService mande el estado
    this.isAuthenticated = this.auth.isAuthenticated;
  }

  modal: 'login' | 'forgot' | 'register' | null = null;
  openLogin(){ this.modal = 'login'; }
  openForgot(){ this.modal = 'forgot'; }
  openRegister(){ this.modal = 'register'; }
  closeModal(){ this.modal = null; }

  logout() {
    this.auth.logout();        // cierra la sesión (perfil persiste)
    this.open.set(false);
    this.router.navigate(['/']); // vuelve al home
  }

  onBrandClick(ev: Event) {
    // Si está autenticado, evita navegación al home
    if (this.isAuthenticated) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  scrollToSection(link: string, event?: Event) {
    if (event) event.preventDefault();

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
    const element = document.getElementById(elementId);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }
}
