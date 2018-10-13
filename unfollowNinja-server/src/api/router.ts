import {RequestHandler, Router} from 'express';
import * as passport from 'passport';
import Dao, {UserCategory} from '../dao/dao';

const router = Router();
export default router;

const shouldBeLoggedIn: RequestHandler = (req, res, next) => {
    if (!req.session.passport || !req.session.passport.user) {
        res.status(400);
        return res.json({error: 'you must be logged in to access this endpoint'});
    }
    next();
};

const dao = new Dao();

router.get('/', (req, res) => res.json({message: 'Unfollow ninja API is up!'}));

router.get('/auth',  passport.authenticate('twitter'), (req, res) => {
    res.redirect('/v1/infos');
});

router.get('/infos', shouldBeLoggedIn, (req, res) => {
    const { username, id, photo, dmId, dmPhoto } = req.user;
    if (dmId) {
        dao.getCachedUsername(dmId).then((dmUsername) => {
            res.json( { username, id, photo, dmId, dmUsername, dmPhoto });
        });
    } else {
        res.json( { username, id, photo });
    }
});

router.get('/auth-dm-app', shouldBeLoggedIn, passport.authenticate('twitter-dm', { session: false }), (req, res) => {
    const { username, id, photo, token, tokenSecret } = req.user;
    Promise.all([
        dao.getUserDao(req.session.passport.user.id).setUserParams({
            dmId: id,
            dmPhoto: photo,
            dmToken: token,
            dmTokenSecret: tokenSecret,
        }),
        dao.getUserDao(req.session.passport.user.id).setCategory(UserCategory.enabled),
        dao.addTwittoToCache({id, username}),
    ]).then(() => res.redirect('/v1/infos'));
});

router.get('/remove-dm-app', shouldBeLoggedIn, (req, res) => {
    Promise.all([
        dao.getUserDao(req.session.passport.user.id).setCategory(UserCategory.disabled),
        dao.getUserDao(req.session.passport.user.id).setUserParams({
            dmId: null,
            dmPhoto: null,
            dmToken: null,
            dmTokenSecret: null,
        }),
    ]).then(() => res.redirect('/v1/infos'));
});
