
(function cdwloader() {

    var bootstrapcss = "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css";
    var testServer = "https://lt-a0062163.corp.cdw.com/payments/_authorize";
    var liveServer = "https://somepartnersapiserverurl";//TODO: change to live server

    var api = new ApiModule(bootstrapcss, testServer, liveServer);

    var main = function () {

        api.loadForm();
    }

    if (window.jQuery === undefined || window.jQuery.fn.jquery !== '3.1.1') {
        api.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js', function () {
            api.jQuery = window.jQuery;
            api.loadScript('https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js', function () {
                api.jQuery = window.jQuery;
                api.loadScript('https://cdnjs.cloudflare.com/ajax/libs/iframe-resizer/3.5.14/iframeResizer.min.js', main);
            });
        });
    } else {
        api.loadScript('https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js', main);
    }

})();

function ApiModule(bootstrapcss, test, live) {
    var formId = '';
    var btnId = '';
    var error = '';
    var builder = new RequestBuilder(bootstrapcss, test, live);
    var creditCardDom;
    var controls = [
        { Name: 'Number', Lable: 'Credit Card Number' },
        { Name: 'Name', Lable: 'Full Name' },
        { Name: 'ExpirationMonth', Lable: 'MM' },
        { Name: 'ExpirationYear', Lable: 'YYYY' },
        { Name: 'CVV', Lable: 'CVV' }
    ];


    var request = builder.process();
    var _$container;
    var api = {
        jQuery: {}

    }

    api.loadScript = function (src, callback) {
        var js = document.createElement('script');
        js.src = src;
        js.type = 'text/javascript';

        if (typeof callback === 'function') {
            js.addEventListener('load', callback);
        }
        document.body.appendChild(js);
    }

    api.loadForm = function () {
        api.jQuery(document).ready(function ($) {
            _$container = $("#" + request.element);

            cssLoader.init($, request);

            if (isRequestValid()) {
                addFormTo();
                return;
            }
            _$container.append('<hr/><h3>CDW Form can not be used </h3><p>' + error + '</p>');

        });

    }

    function addFormTo() {
        formId = 'cdw_form_' + new Date().getTime();
        btnId = 'cdw_btn' + new Date().getTime();

        //add form      
        _$container.append('<hr/><h3>CDW Form:</h3><hr/>');
        _$container.append('<form id=' + formId + '></form>');
        var $form = $("#" + formId);

        //add conrols to form
        for (var i = 0; i < controls.length; i++) {
            $form.append(domControlsLoader.inputbox(controls[i].Name, controls[i].Lable));
        }
        //add button to form
        $form.append('<button id=' + btnId + 'type= "submit" class="btn btn-primary" >Validate</button >');

        $form.on('submit', submitForm);
        $(".cdw_validations").hide();

        //get all controls for later
        creditCardDom = domControlsLoader.creditCardDom(controls);
    }

    function submitForm() {

        //validate input
        var isvalid = domValidator.process($);

        //if invalid show it
        if (!isvalid) {
            return false;

        }
        //if valid call partners API _authorize payment
        //on success make read only form
        //set GUID somewhere : where?
        var cc = {};
        for (var i = 0; i < controls.length; i++) {
            cc[controls[i].Name] = creditCardDom[i].val();
        }
        var pos = '';
        getLocation();
        var data = {
            TransactionId: request.transactionId,
            IpAddress: navigator.ipAddress,
            GeoLocation: pos,
            UserAgent: navigator.userAgent,
            CreditCard: cc
        };

        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition);
            } else {
                pos = "Geolocation is not supported by this browser.";
            }


            function showPosition(position) {
                pos = "Latitude: " + position.coords.latitude + " Longitude: " + position.coords.longitude;
            }
        }
        var jqxhr = $.post(request.server + "123", data, function () {
            // alert("success");
            var i = a;

        })
            .done(function (a, b, c) {
                sendCallBack("done");

            })
            .fail(function (a, b, c) {
                sendCallBack("failed");
                //TODO: add validation updates here

            })
            .always(function () {
               // sendCallBack("always");
            });

     

        return false;


    };

    function isRequestValid() {
        //   return true;
        //if (window.location.protocol != "https:") {
        //    error = "can not be used over http";
        //    return false;
        //}
        if (request.element == undefined || request.element.length <= 0) {
            error = "element needs to be provided as a ' data-element'";
            return false;
        }
        if (request.token == undefined || request.token.length <= 0) {
            error = "token needs to be provided as a 'data-key'";
            return false;
        }
        if (request.transactionId == undefined || request.transactionId.length <= 0) {
            error = "transactionId needs to be provided as a 'data-transaction-id'";
            return false;
        }
        return true;
    }
    function sendCallBack(msg) {
        if ($("#" + request.callbackelement).length > 0) {
            $("#" + request.callbackelement).html(msg);
        }

    }
    return api;

};

function RequestBuilder(bootstrapcss, test, live) {
    var _bootstrapcss = bootstrapcss;
    var _test = test;
    var _live = live;
    return {
        process: function _process() {
            var request = {};
            var scriptTag = document.querySelector('script');
            request.token = scriptTag.getAttribute('data-key');
            request.reach = scriptTag.getAttribute('data-reach');
            request.client = scriptTag.getAttribute('data-name');
            request.element = scriptTag.getAttribute('data-element');
            request.callbackelement = scriptTag.getAttribute('data-callback-element');
            request.transactionId = scriptTag.getAttribute('data-transaction-id');

            request.server = _test; //default

            if (request.reach === 'pk_live') {
                request.server = _live;
            }
            request.bostrapcss = _bootstrapcss;
            return request;

        }
    }
};

var cssLoader = (function () {

    return {
        init: function ($, request) {
            $("<link>",
                {
                    rel: "stylesheet",
                    type: "text/css",
                    href: request.bostrapcss
                }).appendTo('head');

            //$("<link>",
            //    {
            //        rel: "stylesheet",
            //        type: "text/css",
            //        href: request.sitecss
            //    }).appendTo('head');

        }
    }
})();

var domValidator = (function () {

    return {
        process: function _process($) {
            //validate input
            var isvalid = true;
            var ccNumber = $("#cdw_Number").val();
            var name = $("#cdw_Name").val();
            var mm = $("#cdw_ExpirationMonth").val();
            var yy = $("#cdw_ExpirationYear").val();
            var cvv = $("#cdw_CVV").val();
            var errorClass = "has-error has-feedback";
            $(".ccNumber").removeClass(errorClass);
            $(".cdw_validations").hide();

            if (ccNumber.length < 12) {
                $(".ccNumber").addClass(errorClass);
                $(".ccNumber").show();
                isvalid = false;
            }
            if (name.length < 3) {
                $(".ccName").addClass(errorClass);
                $(".ccName").show();

                isvalid = false;
            }
            if (mm.length < 1 || mm < 1 || mm > 12) {
                $(".ccExpirationMonth").addClass(errorClass);
                $(".ccExpirationMonth").show();

                isvalid = false;
            }
            if (yy.length < 4 || yy < new Date().getYear()) {
                $(".ccExpirationYear").addClass(errorClass);
                $(".ccExpirationYear").show();

                isvalid = false;
            }
            if (cvv.length < 1 || cvv < 1) {
                $(".ccCVV").addClass(errorClass);
                $(".ccCVV").show();

                isvalid = false;
            }

            return isvalid;


        }
    }
})();

var domControlsLoader = (function () {

    return {
        inputbox: initInputBox,
        creditCardDom: creditCardDom

    }

    function creditCardDom(ids) {
        var obj = [];
        for (var i = 0; i < ids.length; i++) {
            obj[i] = $('#cdw_' + ids[i].Name);
        }
        return obj;
    }
    function initInputBox(controlName, label) {
        var id = "cdw_" + controlName;
        var className = "cc" + controlName;

        var html =
            '<div class="form-group ' +
            className +
            '">' +
            '<label for="' + id + '">' + label + ':</label>' +
            '<input type="text" class="form-control" id="' + id + '" placeholder="' + label + '" required/> ' +
            '<div class="glyphicon glyphicon-remove form-control-feedback ' + className + ' cdw_validations"></div> ' +
            '</div>';
        return html;

    }
})();