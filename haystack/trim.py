def trim(s):
    """
    Removes partial unicode characters from the end of the string
    So, "34\u2345\u3456" remains untouched
        "34\u2345\u3456\u45" its last \u and later characters removed
        "34\u2345\u3456\" would have its last backslash removed
    """
    
    if (s[-1] == "\\"):   # Need to escape backslashes
        # Just the last character needs to be removed
        return s[:-1]
                    
    else:
        # Search for "\u" in the last five characters
        # If found, return everything before that
        # Otherwise, just return the whole string unchanged
        loc = s.rfind("\u", -5)

        if (loc != -1):
            return s[:loc]
        else:
            return s


    

def testTrim():
    str0 = "34\u2345\u3456"
    str1 = "\u1234\u2345\u3456"
    str2 = "\u2345\u3456\\"
    str3 = "34\u2345\u3456\u"
    str4 = "34\u2345\u3456\u3"
    str5 = "34\u2345\u3456\u34"
    str6 = "34\u2345\u3456\u345"
    
    print("Testing trim...")
    assert(trim(str0) == str0)
    assert(trim(str1) == str1)
    assert(trim(str2) == str2[:12])
    assert(trim(str3) == str3[:14])
    assert(trim(str4) == str4[:14])
    assert(trim(str5) == str5[:14])
    assert(trim(str6) == str6[:14])
    print("Passed my dumb test cases")

testTrim()
