import unittest
from unittest.mock import Mock
from browser_worker import Controller,origin

class BrowserControllerTests(unittest.TestCase):
    def setUp(self):
        self.pw=Mock();self.controller=Controller(self.pw)
        self.page=self.pw.chromium.launch.return_value.new_context.return_value.new_page.return_value
        self.page.url='about:blank';self.page.is_closed.return_value=False;self.page.title.return_value=''
    def test_status_does_not_launch(self):
        self.assertFalse(self.controller.handle({'action':'status'})['running'])
        self.pw.chromium.launch.assert_not_called()
    def test_visible_launch_and_close(self):
        result=self.controller.handle({'action':'launch','visible':True})
        self.assertTrue(result['visible']);self.assertFalse(self.pw.chromium.launch.call_args.kwargs['headless'])
        self.assertFalse(self.controller.handle({'action':'close'})['running'])
        self.assertFalse(self.controller.allowed)
    def test_no_silent_replacement_of_headless_session(self):
        self.controller.handle({'action':'snapshot'})
        with self.assertRaises(ValueError):self.controller.handle({'action':'launch','visible':True})
        self.pw.chromium.launch.assert_called_once()
    def test_invalid_url_does_not_launch(self):
        with self.assertRaises(ValueError):self.controller.handle({'action':'navigate','url':'file:///etc/passwd'})
        self.pw.chromium.launch.assert_not_called()
    def test_route_blocks_other_origins(self):
        self.controller.allowed={origin('https://example.invalid')}
        route=Mock();route.request.url='https://other.invalid/path';self.controller.route(route)
        route.abort.assert_called_once();route.continue_.assert_not_called()
        route=Mock();route.request.url='https://example.invalid/path';self.controller.route(route)
        route.continue_.assert_called_once()
    def test_closed_page_reopens_cleanly(self):
        self.controller.handle({'action':'launch','visible':True})
        self.page.is_closed.return_value=True
        self.assertFalse(self.controller.handle({'action':'status'})['running'])
        self.controller.handle({'action':'launch','visible':True})
        self.assertEqual(self.pw.chromium.launch.call_count,2)

    def test_passive_frame_does_not_start_browser(self):
        self.assertFalse(self.controller.handle({'action':'frame'})['running'])
        self.pw.chromium.launch.assert_not_called()
    def test_user_input_and_model_use_same_page(self):
        self.controller.handle({'action':'launch'})
        self.controller.handle({'action':'pointer','x':123,'y':345})
        self.page.mouse.click.assert_called_once_with(123,345)
        self.controller.handle({'action':'type','text':'bonjour'})
        self.page.keyboard.insert_text.assert_called_once_with('bonjour')
        self.controller.handle({'action':'fill','selector':'#name','text':'Corpus'})
        self.page.locator.return_value.fill.assert_called_with('Corpus')
        self.pw.chromium.launch.assert_called_once()
    def test_control_port_cannot_be_approved_by_browser(self):
        for url in ('http://localhost:18743/','http://127.0.0.1:18743/corpus/api/browser'):
            with self.assertRaises(ValueError):origin(url)
    def test_invalid_key_and_coordinate_rejected(self):
        with self.assertRaises(ValueError):self.controller.handle({'action':'key','key':'Control+Alt+Delete'})
        with self.assertRaises(ValueError):self.controller.handle({'action':'pointer','x':2000,'y':1})

    def test_tabs_preserve_separate_permissions(self):
        second=Mock();second.url='about:blank';second.is_closed.return_value=False;second.title.return_value='Second'
        self.pw.chromium.launch.return_value.new_context.return_value.new_page.side_effect=[self.page,second]
        self.controller.handle({'action':'launch'})
        first_id=self.controller.tabs[0]['id'];self.controller.allowed.add('https://first.invalid:443')
        result=self.controller.handle({'action':'tab-new'})
        self.assertEqual(len(result['tabs']),2);self.assertFalse(self.controller.allowed)
        second_id=self.controller.tabs[1]['id']
        self.controller.handle({'action':'tab-select','tab':first_id})
        self.assertIn('https://first.invalid:443',self.controller.allowed)
        self.controller.handle({'action':'tab-close','tab':second_id})
        second.close.assert_called_once();self.assertEqual(len(self.controller.tabs),1)
    def test_mobile_pointer_uses_current_viewport(self):
        self.controller.handle({'action':'device','mobile':True})
        self.page.set_viewport_size.assert_called_with({'width':390,'height':844})
        with self.assertRaises(ValueError):self.controller.handle({'action':'pointer','x':500,'y':10})
    def test_clear_removes_history_and_tabs(self):
        self.controller.handle({'action':'launch'})
        self.controller.history.append({'url':'https://example.invalid'})
        self.controller.handle({'action':'clear'})
        self.assertFalse(self.controller.history);self.assertFalse(self.controller.tabs)

if __name__=='__main__':unittest.main()
