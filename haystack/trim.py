def trim(s):
    """
    Removes partial unicode characters from the end of the string
    So, "34\u2345\u3456" remains untouched
        "34\u2345\u3456\u45" its last \u and later characters removed
        "34\u2345\u3456\" would have its last backslash removed
        Edge case: Empty string, which obviously would be returned as it is
    """
    
    if s == "":
        return s
    
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


def isTrimmed(s):
    """
    A string is "trimmed" if there's no partial unicode encoding at the end.

    \u9000 is good, but a\u900 is not, and neither are asdf\u or asdfg\
    654321              654321                         654321    654321
    
    So, we return True if the string is empty, or if both these are true:
    i)   There is no instance of \u in the last five characters
    ii)  The last character is not a \
    """

    if (s == ""):
        return True

    else:
        condition1 = (s.rfind("\u", -5) == -1)
        condition2 = (s[-1] != "\\")

        return condition1 and condition2


    

def testTrim():
    str0 = "34\u2345\u3456"
    str1 = "\u1234\u2345\u3456"
    str2 = "\u2345\u3456\\"
    str3 = "34\u2345\u3456 \u"
    str4 = "34\u2345\u3456\u3"
    str5 = "34\u2345\u3456\u34"
    str6 = "34\u2345\u3456\u345"
    
    print("Testing trim...")
    assert(trim(str0) == str0)
    assert(trim(str1) == str1)
    assert(trim(str2) == str2[:12])
    assert(trim(str3) == str3[:15])
    assert(trim(str4) == str4[:14])
    assert(trim(str5) == str5[:14])
    assert(trim(str6) == str6[:14])
    print("Passed my dumb test cases")

def testTrim2():
    str0 = "34\u2345\u3456"
    str1 = "\u1234\u2345\u3456"
    str2 = "\u2345\u3456\\"
    str3 = "34\u2345\u3456 \u"
    str4 = "34\u2345\u3456\u3"
    str5 = "34\u2345\u3456\u34"
    str6 = "34\u2345\u3456\u345"
    
    print("Testing trim...")
    assert(isTrimmed(trim(str0))) 
    assert(isTrimmed(trim(str1)))
    assert(isTrimmed(trim(str2)))
    assert(isTrimmed(trim(str3)))
    assert(isTrimmed(trim(str4)))
    assert(isTrimmed(trim(str5)))
    assert(isTrimmed(trim(str6)))
    print("Passed my smarter test cases")

