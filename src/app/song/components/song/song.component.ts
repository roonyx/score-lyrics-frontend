import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { SongService, CurrentUserService } from '@app/core/services';
import {
  ISong,
  IVote,
  IUser,
} from '@lib/models';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { Router, ActivatedRoute } from '@angular/router';
import { RatingService } from '@app/song/services';
import { MatSnackBar, MatDialog } from '@angular/material';
import { AuthModalComponent } from '@app/shared/components';

@Component({
  selector: 'app-song',
  templateUrl: './song.component.html',
  styleUrls: ['./song.component.scss']
})
export class SongComponent implements OnInit, OnDestroy {
  public song: ISong;
  public vote: IVote;
  public user: IUser;
  public isUserSong: boolean;
  private songId = +this._route.snapshot.paramMap.get('id');

  constructor(
    private _songService: SongService,
    private _currentUser: CurrentUserService,
    private _ratingService: RatingService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
  ) { }

  public ngOnInit() {
    this.user = this._currentUser.currentUser;
    this.getSong();
  }

  public ngOnDestroy() { }

  public getSong(): void {
    this._songService.getSong(this.songId)
      .pipe(untilDestroyed(this))
      .subscribe(
        (song) => {
          this.song = song;
          this.vote = song.vote;
          this.isUserSong = this.user && this.user.id === this.song.author.id;
          if (this.vote === null && this.user) {
            this.vote = {
              mark: null,
              user_id: this.user.id,
            };
          }
        }
      );
  }

  public rateSong(mark: boolean | null): void {
    let rating: string;
    switch (mark) {
      case true: {
        rating = 'liked';
        break;
      }
      case false: {
        rating = 'disliked';
        break;
      }
      case null: {
        rating = 'canceled rating of';
        break;
      }
    }
    this._ratingService.rateSong(this.songId, mark)
      .pipe(untilDestroyed(this))
      .subscribe(
        () => {
          this._snackBar.open(`You ${rating} the song and lyrics.`, 'Undo', {
            duration: 2000
          });
        }
      );
  }

  public putMark(key: string): void {
    if (!this.user) {
      this.dialog.open(AuthModalComponent);
      return;
    }
    const condition = key === 'likes';
    if (this.vote && this.vote.mark === condition) {
      this.rateSong(null);
      this.song.rating[key]--;
      if (this.vote.mark !== condition) {
        this.song.rating.dislikes++;
      }
      this.vote.mark = null;
    } else {
      this.rateSong(condition);
      if (this.vote && this.vote.mark === !condition) {
        key === 'likes' ? this.song.rating.dislikes--
          : this.song.rating.likes--;
        this.vote.mark = condition;
      }
      this.song.rating[key]++;
      this.vote.mark = condition;
    }
  }

  public navigateToEditSong(): void {
    this._router.navigate(['songs/edit', this.songId]);
  }

  public showUserProfile(): void {
    if (this.isUserSong) {
      this._router.navigate(['profile']);
    } else {
      this._router.navigate(['users', this.song.author.id]);
    }
  }

  get isLiked(): boolean {
    return this.vote && this.vote.mark;
  }

  get isDisliked(): boolean {
    return this.vote && this.vote.mark === false;
  }
}
