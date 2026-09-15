import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import {FidjNodeService, FidjError} from '../../src';
use(spies);

// A refusal from POST /apps/:appId/tokens carries the reason it refused, and
// for `agreement_required` it carries the agreement itself. Ajax keeps that
// body; login used to drop it, because it built its FidjError from
// `err.toString()` and an object literal stringifies to "[object Object]".
//
// It matters twice. The caller cannot show the agreement it was just asked for
// without fetching it again — and what comes back may not be the version the
// API compared against. And every message keyed on the reason, like the
// `unknown-user` branch in the entry's error wording, could never match.
describe('SDK login refusals', () => {
    afterEach(() => spy.restore());

    const refusedWith = async (rejection: any) => {
        const sdk = new FidjNodeService();
        spy.on((sdk as any).connection, 'isReady', () => true);
        spy.on(sdk as any, '_removeAll', async () => undefined);
        spy.on(sdk as any, '_createSession', async () => undefined);
        spy.on(sdk as any, '_loginInternal', async () => {
            throw rejection;
        });
        try {
            await sdk.login('person@test.local', 'test-password');
            return null;
        } catch (error) {
            return error as FidjError;
        }
    };

    it('hands the caller the body the API refused with', async () => {
        const agreement = {version: '2026-09-11', text: 'The full agreement.'};
        const error: any = await refusedWith({
            reason: 'STATUS',
            status: 409,
            code: 409,
            message: {code: 'agreement_required', message: 'Accept it.', agreement},
        });
        assert.instanceOf(error, FidjError);
        assert.equal(error.code, 409);
        assert.deepEqual(error.details, {
            code: 'agreement_required',
            message: 'Accept it.',
            agreement,
        });
    });

    it('says why in words, rather than [object Object]', async () => {
        const error: any = await refusedWith({
            reason: 'STATUS',
            status: 401,
            code: 401,
            message: {status: 'unknown-user'},
        });
        assert.equal(error.code, 401);
        assert.notInclude(String(error.reason), '[object Object]');
        assert.include(String(error.reason), 'unknown-user');
    });

    it('leaves a FidjError thrown from inside exactly as it was', async () => {
        const original = new FidjError(403, 'not connected');
        const error: any = await refusedWith(original);
        assert.strictEqual(error, original);
    });

    it('still reports a refusal that carried no body at all', async () => {
        const error: any = await refusedWith(new Error('socket hang up'));
        assert.equal(error.code, 500);
        assert.include(String(error.reason), 'socket hang up');
        assert.isUndefined(error.details);
    });
});
