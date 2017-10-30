"use strict";
(function cdwloader() {


    // var testServer = "https://localhost:44390";
    var testServer = "http://localhost:54895";
    var liveServer = "https://somepartnersapiserverurl";//TODO: change to live server
    var action = "/payments/_authorize";
    var api = new ApiModule(testServer, liveServer, action);

    var main = function () {

        api.loadForm();
    }


    if (window.jQuery === undefined || window.jQuery.fn.jquery !== '3.1.1') {
        api.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js', function () {
            api.setjQuery(window.jQuery);
            main();
        });
    } else {
        api.setjQuery(window.jQuery);
    }
})();

function ApiModule(test, live, action) {
    var formId;
    var btnId = '';
    var error = '';
    var creditCardDom;
    var $container;
    var jQuery = {};

    var years = [];
    var today = new Date().getFullYear();
    for (var i = today; i <= today + 10; i++) years.push(i);
    var controls = [
        { Name: 'Number', Lable: 'Credit Card Number', Type: "input" },
        { Name: 'Name', Lable: 'Full Name', Type: "input" },
        { Name: 'ExpirationMonth', Lable: 'MM', Type: "combo", Values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
        { Name: 'ExpirationYear', Lable: 'YYYY', Type: "combo", Values: years },
        { Name: 'CVV', Lable: 'CVV', Type: "input" }
    ];

    var builder = new RequestBuilder(test, live, action);
    var request = builder.process();

    var api = {
        setjQuery: function (jquery) {
            jQuery = jquery;
        }
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
        jQuery(document).ready(function ($) {
            $container = $("#" + request.element);

            cssLoader.init($, request);

            if (isRequestValid()) {
                addFormElements();
                return;
            }
            $container.append('<hr/><h3>CDW Form can not be used </h3><p>' + error + '</p>');

        });

    }

    function addFormElements() {
        formId = 'cdw_form_' + new Date().getTime();
        btnId = 'cdw_btn' + new Date().getTime();

        //add box     
        var box = '<div class="cdw_form"></div>';
        $container.append(box);
        var $box = $(".cdw_form");
        $box.append('<hr/><h3>CDW Form:</h3><hr/>');

        //add conrols to box
        for (var i = 0; i < controls.length; i++) {
            $box.append(domControlsLoader.initControl(controls[i]));
        }
        //add button to box
        if (!request.hidebutton) {
            $box.append('<input id=' + btnId + ' type="button" class="cdw_button" value="Validate">');
            $("#" + btnId).on('click', submitForm);
            $('body').keyup(function (event) {
                if (event.keyCode === 13) {
                    submitForm();
                }
            });
        }
        else//or use partner's button
        {
            $("#" + request.partnerbutton).on('click', submitForm);
        }

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
        $.ajax({
            type: "POST",
            url: request.authorize,
            dataType: "json",
            data: data,
            success: function (result) {
                sendCallBack(result.TransactionId);

            },
            error: function (err) {
                sendCallBack("error");
                if (err.statusText === "Unauthorized") {
                    sendCallBack("Unauthorized");
                    return;
                }
                var data = err.responseJSON;
                for (var j = 0; j < data.length; j++) {
                    var ctr = creditCardDom[data[j]];//TODO; ned to have good fields
                    ctr = { "Field": "Number", "Message": "Invalid Credit Card" };
                    if ($("#cdw_" + ctr.Field).length) {

                        $(".cdw_val" + ctr.Field).show();
                        $(".cdw_val" + ctr.Field).html(data[j].Message);
                    }
                }

            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + request.token);
            }
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
        if (request.hidebutton === "true") {//true
            request.hidebutton = true;
        }
        else if (request.hidebutton === "false" || request.hidebutton === undefined) {//false
            request.hidebutton = false;
        } else {//bad data
            request.hidebutton = false;
        }
        if (request.hidebutton === true && request.partnerbutton == undefined) {
            request.hidebutton = false;
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

function RequestBuilder(test, live, action) {
    var _test = test;
    var _live = live;
    var _action = action;
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
            request.hidebutton = scriptTag.getAttribute('data-no-button');
            request.partnerbutton = scriptTag.getAttribute('data-my-button');

            request.server = _test; //default

            if (request.reach === 'pk_live') {
                request.server = _live;
            }
            request.sitecss = request.server + "/css/site.css";
            request.authorize = request.server + _action;

            return request;

        }
    }
};

var cssLoader = (function () {

    return {
        init: function ($, request) {
            //$("<link>",
            //    {
            //        rel: "stylesheet",
            //        type: "text/css",
            //        href: request.bostrapcss
            //    }).appendTo('head');

            $("<link>",
                {
                    rel: "stylesheet",
                    type: "text/css",
                    href: request.sitecss
                }).appendTo('head');

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

            $(".cdw_error").hide();

            if (ccNumber.length < 12) {
                $(".cdw_valNumber").html("Number is required > 12");

                $(".cdw_valNumber").show();
                isvalid = false;
            }
            if (name.length < 3) {
                $(".cdw_valName").html("Name is required");
                $(".cdw_valName").show();
                isvalid = false;
            }
            if (mm.length < 1 || mm < 1 || mm > 12) {
                $(".cdw_valExpirationMonth").html("MM is required");
                $(".cdw_valExpirationMonth").show();
                isvalid = false;
            }
            if (yy.length < 4 || yy < new Date().getYear()) {
                $(".cdw_valExpirationYear").html("YYYY is required");
                $(".cdw_valExpirationYear").show();

                isvalid = false;
            }
            if (cvv.length < 1 || cvv < 1) {
                $(".cdw_valCVV").html("CVV is required");

                $(".cdw_valCVV").show();
                isvalid = false;
            }

            return isvalid;


        }
    }
})();

var domControlsLoader = (function () {

    return {
        initControl: initControl,
        creditCardDom: creditCardDom

    }

    function creditCardDom(ids) {
        var obj = [];
        for (var i = 0; i < ids.length; i++) {
            obj[i] = $('#cdw_' + ids[i].Name);
        }
        return obj;
    }
    function initControl(control) {
        if (control.Type === 'combo') {
            //  [i].Name, controls[i].Lable//
            return initComboBox(control.Name, control.Lable, control.Values);

        }
        if (control.Type === 'input') {
            return initInputBox(control.Name, control.Lable);
        }
    }

    function initComboBox(controlName, label, values) {
        var id = "cdw_" + controlName;
        var className = "cdw_cc" + controlName;
        var options = "<option> </option>";
        for (var i = 0; i < values.length; i++) {
            options = options + ' <option value="' + values[i] + '">' + values[i] + '</option>';
        }
        var html =
            '<div class="form-group ' +
            className +
            '">' +
            '<label class="cdw_label" for="' + id + '">' + label + ':</label>' +
            '<select id=' + id + ' class=cdw_select >' + options + '</select>' +
            '<span class=" cdw_error cdw_padd cdw_val' + controlName + '">*</span>' +
            '</div>';
        return html;
    }

    function initInputBox(controlName, label) {
        var id = "cdw_" + controlName;
        var className = "cdw_cc" + controlName;

        var html =
            '<div class="form-group ' +
            className +
            '">' +
            '<label class="cdw_label" for="' + id + '">' + label + ':</label>' +
            '<input type="text" class="cdw_input" id="' + id + '" placeholder="' + label + '" required/> ' +
            '<span class="cdw_error cdw_val' + controlName + '">*</span>' +
            '</div>';
        return html;

    }
})();